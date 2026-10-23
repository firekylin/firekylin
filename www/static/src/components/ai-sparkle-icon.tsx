import './ai-sparkle-icon.less';

export default function AISparkleIcon({loading = false}: {loading?: boolean}) {
    return (
        <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true"
            className={`ai-sparkle-icon${loading ? ' is-loading' : ''}`}>
            <path fill="currentColor"
                d="M12 2C13.8 8.2 15.8 10.2 22 12C15.8 13.8 13.8 15.8 12 22C10.2 15.8 8.2 13.8 2 12C8.2 10.2 10.2 8.2 12 2Z" />
        </svg>
    );
}
