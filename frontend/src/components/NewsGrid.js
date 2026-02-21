import NewsCard from "@/components/NewsCard";

export default function NewsGrid({ stories, showImages }) {
  if (!stories || stories.length === 0) {
    return (
      <div data-testid="no-stories" className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-muted-foreground text-6xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
        </div>
        <p className="text-muted-foreground text-sm">No stories available yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Stories will appear after the next fetch cycle</p>
      </div>
    );
  }

  return (
    <div data-testid="news-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stories.map((story, index) => (
        <NewsCard
          key={story.story_hash || index}
          story={story}
          featured={index < 2 && story.relevance_score >= 8}
          showImages={showImages}
        />
      ))}
    </div>
  );
}
