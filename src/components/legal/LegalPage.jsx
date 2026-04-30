import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './LegalPage.css';

function Section({ section }) {
    return (
        <motion.section
            className="legal__section"
            id={section.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
            <h2 className="legal__h2">{section.title}</h2>

            {section.content?.map((p, i) => (
                <p key={i} className="legal__p">
                    {p}
                </p>
            ))}

            {section.items && (
                <ul className="legal__ul">
                    {section.items.map((item, i) => (
                        <li key={i} className="legal__li">
                            {item}
                        </li>
                    ))}
                </ul>
            )}

            {section.subsections?.map((sub) => (
                <div key={sub.title} className="legal__subsection">
                    <h3 className="legal__h3">{sub.title}</h3>
                    {sub.content?.map((p, i) => (
                        <p key={i} className="legal__p">
                            {p}
                        </p>
                    ))}
                    {sub.items && (
                        <ul className="legal__ul">
                            {sub.items.map((item, i) => (
                                <li key={i} className="legal__li">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    )}
                    {sub.footer && (
                        <p className="legal__footer-note">{sub.footer}</p>
                    )}
                </div>
            ))}

            {section.footer && (
                <p className="legal__footer-note">{section.footer}</p>
            )}
        </motion.section>
    );
}

function TableOfContents({ sections, activeId }) {
    return (
        <nav className="legal__toc">
            <span className="legal__toc-title">Содержание</span>
            <ul className="legal__toc-list">
                {sections.map((s) => (
                    <li key={s.id}>
                        <a
                            href={`#${s.id}`}
                            className={`legal__toc-link ${
                                activeId === s.id ? 'legal__toc-link--active' : ''
                            }`}
                        >
                            {s.title}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default function LegalPage({ data }) {
    const [activeId, setActiveId] = useState('');
    const contentRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                        break;
                    }
                }
            },
            {
                rootMargin: '-20% 0px -70% 0px',
                threshold: 0,
            }
        );

        const headings = contentRef.current?.querySelectorAll('section[id]');
        headings?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <motion.div
            className="legal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <div className="legal__glow" />

            <div className="legal__container">
                <aside className="legal__sidebar">
                    <TableOfContents sections={data.sections} activeId={activeId} />
                </aside>

                <main className="legal__main" ref={contentRef}>
                    <header className="legal__header">
                        <p className="legal__eyebrow">Attuned</p>
                        <h1 className="legal__title">{data.title}</h1>
                        <p className="legal__date">
                            Дата вступления в силу: {data.effectiveDate}
                        </p>
                    </header>

                    <div className="legal__body">
                        {data.sections.map((section) => (
                            <Section key={section.id} section={section} />
                        ))}
                    </div>

                    <footer className="legal__footer">
                        <p>© Attuned, {new Date().getFullYear()}</p>
                    </footer>
                </main>
            </div>
        </motion.div>
    );
}
