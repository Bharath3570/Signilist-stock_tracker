export default function WatchlistNewsSection({ news }: WatchlistNewsProps) {
    if (!news || news.length === 0) return null;

    return (
        <section className='space-y-5'>
            <h2 className='watchlist-title'>News</h2>

            <div className='watchlist-news'>
                {news.map((article) => (
                    <a
                        key={article.id}
                        href={article.url}
                        target='_blank'
                        rel='noreferrer'
                        className='news-item flex flex-col'
                    >
                        <div className='news-tag'>{article.related || article.source}</div>
                        <h3 className='news-title'>{article.headline}</h3>
                        <div className='news-meta'>
                            <span>{article.source}</span>
                        </div>
                        <p className='news-summary'>{article.summary}</p>
                        <span className='news-cta'>Read More</span>
                    </a>
                ))}
            </div>
        </section>
    );
}
