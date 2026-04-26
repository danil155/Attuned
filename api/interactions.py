import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from db_service import UserDataCrud, UserInteractionCrud, UserCartCrud, SearchCrud

logger = logging.getLogger(__name__)
router = APIRouter(tags=['websocket'])


def _get_db(websocket: WebSocket):
    return websocket.app.state.db


@router.websocket('/interactions')
async def websocket_interactions(websocket: WebSocket):
    await websocket.accept()
    db = _get_db(websocket)

    try:
        auth_data = await websocket.receive_json()
        token = auth_data.get('token')

        async with db.session() as session:
            user_crud = UserDataCrud(session)
            user = await user_crud.get_user_by_token(token)

            if not user:
                logger.warning(f'Failed WS auth attempt with token {token[:8]}...')
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            user_id = user.id
            interaction_crud = UserInteractionCrud(session)
            cart_crud = UserCartCrud(session)
            search_crud = SearchCrud(session)

            while True:
                data = await websocket.receive_text()
                message = json.loads(data)

                action = message.get('action')

                if action == 'sync':
                    interactions = await interaction_crud.get_all_interactions(user_id)
                    carts = await cart_crud.get_user_carts(user_id)

                    enriched_interactions = []
                    for game_id, interaction in interactions.items():
                        game = await search_crud.search_by_id(game_id)
                        if game:
                            enriched_interactions.append({
                                'igdb_id': game_id,
                                'status': interaction,
                                'game': {
                                    'igdb_id': game.igdb_id,
                                    'name': game.name,
                                    'cover_url': game.cover_url,
                                    'genres': game.genres,
                                    'first_release_date': (
                                        game.first_release_date.strftime('%Y-%m-%d')
                                        if game.first_release_date else None
                                    )
                                } if game else None
                            })

                    cart_game_ids = set()
                    for cart in carts:
                        cart_game_ids.update(cart.games)

                    serializable_games = []
                    if cart_game_ids:
                        for game_id in cart_game_ids:
                            game = await search_crud.search_by_id(game_id)
                            if game:
                                serializable_games.append({
                                    'igdb_id': game.igdb_id,
                                    'name': game.name,
                                    'cover_url': game.cover_url,
                                    'genres': game.genres,
                                    'first_release_date': (
                                        game.first_release_date.strftime('%Y-%m-%d') if game.first_release_date else None
                                    )
                                })

                    await websocket.send_json({
                        'type': 'sync_state',
                        'interactions': enriched_interactions,
                        'carts': [
                            {'id': c.id, 'name': c.name, 'games': list(c.games)}
                            for c in carts
                        ],
                        'games': serializable_games
                    })

                elif action == 'like':
                    igdb_id = int(message.get('igdb_id'))
                    await interaction_crud.like(user_id, igdb_id)
                    await session.commit()
                    await websocket.send_json({'type': 'update',
                                               'target': 'interaction',
                                               'igdb_id': igdb_id,
                                               'status': 'like'})
                elif action == 'dislike':
                    igdb_id = int(message.get('igdb_id'))
                    await interaction_crud.dislike(user_id, igdb_id)
                    await session.commit()
                    await websocket.send_json({'type': 'update',
                                               'target': 'interaction',
                                               'igdb_id': igdb_id,
                                               'status': 'dislike'})
                elif action == 'remove_interaction':
                    igdb_id = int(message.get('igdb_id'))
                    await interaction_crud.remove_interactions(user_id, igdb_id)
                    await session.commit()
                    await websocket.send_json({'type': 'update',
                                               'target': 'interaction',
                                               'igdb_id': igdb_id,
                                               'status': 'None'})
                elif action == 'create_cart':
                    name = message.get('name')
                    new_cart = await cart_crud.create_cart(user_id, name)
                    await session.commit()
                    await websocket.send_json({'type': 'cart_created',
                                               'cart': {'id': new_cart.id, 'name': new_cart.name, 'games': []}
                                               })
                elif action == 'rename_cart':
                    cart_id, new_name = int(message.get('cart_id')), message.get('name')
                    success = await cart_crud.rename_cart(cart_id, new_name)
                    if success:
                        await session.commit()
                        await websocket.send_json({'type': 'update',
                                                   'target': 'cart',
                                                   'action': 'rename',
                                                   'cart_id': cart_id})
                elif action == 'add_to_cart':
                    cart_id, igdb_id = int(message.get('cart_id')), int(message.get('igdb_id'))
                    success = await cart_crud.add_to_cart(cart_id, igdb_id)
                    if success:
                        await session.commit()
                        await websocket.send_json({'type': 'update',
                                                   'target': 'cart',
                                                   'action': 'added',
                                                   'cart_id': cart_id,
                                                   'igdb_id': igdb_id})
                elif action == 'remove_from_cart':
                    cart_id, igdb_id = int(message.get('cart_id')), int(message.get('igdb_id'))
                    success = await cart_crud.remove_from_cart(cart_id, igdb_id)
                    if success:
                        await session.commit()
                        await websocket.send_json({'type': 'update',
                                                   'target': 'cart',
                                                   'action': 'removed',
                                                   'cart_id': cart_id,
                                                   'igdb_id': igdb_id})
                elif action == 'clear_cart':
                    cart_id = int(message.get('cart_id'))
                    await cart_crud.clear_cart(cart_id)
                    await session.commit()
                    await websocket.send_json({'type': 'update',
                                               'target': 'cart',
                                               'action': 'cleared',
                                               'cart_id': cart_id})
                elif action == 'delete_cart':
                    cart_id = int(message.get('cart_id'))
                    await cart_crud.delete_cart(cart_id)
                    await session.commit()
                    await websocket.send_json({'type': 'update',
                                               'target': 'cart',
                                               'action': 'deleted',
                                               'cart_id': cart_id})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f'WebSocket error: {e}', exc_info=True)
        if websocket.client_state.name != 'DISCONNECTED':
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
