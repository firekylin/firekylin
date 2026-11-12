import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {useId, useState, type ReactNode} from 'react';

export default function AdvancedControls({children}: {children: ReactNode}) {
    useTranslation('admin');
    const [expanded, setExpanded] = useState(false);
    const contentId = useId();

    return (
        <section className="advanced-controls">
            <button type="button" className="advanced-controls-toggle"
                aria-expanded={expanded} aria-controls={contentId}
                onClick={() => setExpanded(value => !value)}>
                <span className="advanced-controls-label">{i18n.t("高级功能")}
                    <i className="advanced-controls-arrow" aria-hidden="true" />
                </span>
            </button>
            <div id={contentId} hidden={!expanded}>
                {children}
            </div>
        </section>
    );
}
