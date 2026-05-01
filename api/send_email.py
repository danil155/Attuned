import smtplib
from email.mime.text import MIMEText
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from config import settings

router = APIRouter(prefix='/feedback', tags=['feedback'])

FEEDBACK_TYPES = {
    'bug': 'Ошибка / Баг',
    'idea': 'Идея / Улучшение',
    'impression': 'Общее впечатление',
    'cooperation': 'Сотрудничество'
}


class FeedbackForm(BaseModel):
    feedback_type: str = Field(..., description='Type of feedback: bug, idea, impression, cooperation')
    summary: str | None = Field(None, max_length=200, description='The brief essence of the problem')
    description: str | None = Field(None, max_length=2000, description='Detail description')
    browser: str | None = Field(None, description='Browser name')
    os: str | None = Field(None, description='Operating system')
    external_id: str | None = Field(None, description='User Public ID')
    company_name: str | None = Field(None, max_length=200, description='Company name')
    company_description: str | None = Field(None, max_length=2000, description='Company description')
    contact: str | None = Field(None, max_length=300, description='Contact information')
    importance: int | None = Field(None, ge=1, le=5, description='Importance from 1 to 5')


@router.post('')
async def send_feedback(
        form: FeedbackForm
):
    try:
        body = f"""
        Тип: {FEEDBACK_TYPES.get(form.feedback_type, form.feedback_type)}
        """

        if form.summary:
            body += f"""
        Кратко: {form.summary}
        """

        if form.description:
            body += f"""
        Подробно:
        {form.description}
        """

        browser_info = []
        if form.browser:
            browser_info.append(f"Браузер: {form.browser}")
        if form.os:
            browser_info.append(f"ОС: {form.os}")

        body += f"""
        --- Информация об окружении ---
        {chr(10).join(browser_info) if browser_info else 'Не указано'}
        """

        body += f"""
        --- Пользователь ---
        Public ID: {form.external_id if form.external_id else 'Не указано'}
        """

        if form.importance is not None:
            importance_labels = {
                1: 'Не мешает 😌',
                2: 'Слегка мешает 😐',
                3: 'Мешает 😕',
                4: 'Сильно мешает 😫',
                5: 'Удаляю интернет 💀'
            }
            body += f"""
        --- Важность ---
        {importance_labels.get(form.importance, str(form.importance))} ({form.importance}/5)
        """

        if form.company_name:
            body += f"""
        --- Сотрудничество ---
        Название компании: {form.company_name}
        """
            if form.contact:
                body += f"Контактные данные: {form.contact}\n"
            if form.company_description:
                body += f"""
        Описание компании:
        {form.company_description}
        """

        msg = MIMEText(body, 'plain', 'utf-8')
        msg['From'] = settings.SMTP_USER
        msg['To'] = settings.TO_EMAIL
        msg['Subject'] = f'[ATTUNED FEEDBACK] {FEEDBACK_TYPES.get(form.feedback_type)}'

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.YANDEX_APPLICATION_PASSWORD)
            server.send_message(msg)

        return {'status': 'ok', 'message': 'Message send'}
    except smtplib.SMTPException as e:
        raise HTTPException(status_code=500, detail=f'SMTP error: {str(e)}')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal error: {str(e)}')
