import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, ChevronLeft, ChevronRight, X, ExternalLink, Play } from 'lucide-react';
import { AdminStory, Product } from '../types';
import { useMarket } from '../context/MarketContext';

interface StoriesBarProps {
  onOpenStoryAdmin?: () => void;
  isAdmin?: boolean;
  onNavigateProduct?: (productId: string) => void;
  onSelectProduct?: (productOrId: any) => void;
  onNavigateStore?: (storeId: string) => void;
  onScrollToFeatured?: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  onOpenStoryAdmin,
  isAdmin,
  onNavigateProduct,
  onSelectProduct,
  onNavigateStore,
  onScrollToFeatured,
}) => {
  const { products } = useMarket();
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  // Fetch active stories from backend (max 5 stories enforced)
  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.stories) && data.stories.length > 0) {
          const normalized: AdminStory[] = data.stories.map((s: any) => ({
            id: String(s.id),
            title: s.title || '',
            mediaUrl: s.mediaUrl || s.media_url || '',
            mediaType: s.mediaType || s.media_type || 'image',
            ctaText: s.ctaText || s.cta_text || 'تسوّق الآن',
            ctaLink: s.ctaLink || s.cta_link || '',
            productId:
              s.productId ||
              s.product_id ||
              (s.ctaLink?.startsWith('product:')
                ? s.ctaLink.replace('product:', '').trim()
                : s.cta_link?.startsWith('product:')
                ? s.cta_link.replace('product:', '').trim()
                : undefined),
            startDate: s.startDate || s.start_date || new Date().toISOString(),
            endDate: s.endDate || s.end_date,
            isActive: s.isActive !== undefined ? s.isActive : s.is_active !== undefined ? s.is_active : true,
            viewsCount: Number(s.viewsCount ?? s.views_count ?? 0),
            clicksCount: Number(s.clicksCount ?? s.clicks_count ?? 0),
            sortOrder: Number(s.sortOrder ?? s.sort_order ?? 0),
            createdAt: s.createdAt || s.created_at || new Date().toISOString(),
          }));
          setStories(normalized.slice(0, 5));
        } else {
          setStories([]);
        }
      } else {
        setStories([]);
      }
    } catch (err) {
      console.warn('Failed to fetch stories:', err);
      setStories([]);
    }
  };

  useEffect(() => {
    fetchStories();

    const handleStoriesUpdated = (e: any) => {
      const deletedId = e?.detail?.deletedStoryId;
      if (deletedId) {
        setStories(prev => prev.filter(s => s.id !== deletedId));
      }
      fetchStories();
    };

    window.addEventListener('stories_updated', handleStoriesUpdated);
    return () => {
      window.removeEventListener('stories_updated', handleStoriesUpdated);
    };
  }, []);

  // Story progress timer (5 seconds per story)
  useEffect(() => {
    if (activeStoryIndex === null || stories.length === 0) return;

    setStoryProgress(0);
    const intervalTime = 50; // update every 50ms
    const totalDuration = 5000;
    const increment = (intervalTime / totalDuration) * 100;

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + increment;
      });
    }, intervalTime);

    // Track view in backend
    const currentStory = stories[activeStoryIndex];
    if (currentStory) {
      fetch(`/api/stories/${currentStory.id}/view`, { method: 'POST' }).catch(() => {});
    }

    return () => clearInterval(interval);
  }, [activeStoryIndex, stories.length]);

  const onClose = () => {
    setActiveStoryIndex(null);
    setStoryProgress(0);
  };

  const handlePrevStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setStoryProgress(0);
    }
  };

  const handleNextStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setStoryProgress(0);
    } else {
      onClose();
    }
  };

  const handleCtaClick = (e: React.MouseEvent, story: AdminStory) => {
    e.stopPropagation();
    fetch(`/api/stories/${story.id}/click`, { method: 'POST' }).catch(() => {});

    // جلب معرف المنتج المرتبط بالستوري عبر story.productId أو من ctaLink
    let targetProductId = story.productId;
    if (!targetProductId && story.ctaLink) {
      if (story.ctaLink.startsWith('product:')) {
        targetProductId = story.ctaLink.replace('product:', '').trim();
      } else if (!story.ctaLink.startsWith('http') && !story.ctaLink.startsWith('store:')) {
        targetProductId = story.ctaLink.trim();
      }
    }

    if (onSelectProduct) {
      onSelectProduct(story.productId || targetProductId);
    } else if (onNavigateProduct && targetProductId) {
      onNavigateProduct(targetProductId);
    } else if (story.ctaLink?.startsWith('store:') && onNavigateStore) {
      onNavigateStore(story.ctaLink.replace('store:', '').trim());
    } else if (onScrollToFeatured) {
      onScrollToFeatured();
    }

    onClose();
  };

  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  // When no stories exist:
  // Non-admins see nothing (tray is completely hidden and returns null with 0 height/content).
  // Admin sees a clean shortcut button to publish the platform's first story.
  if (stories.length === 0) {
    if (!isAdmin || !onOpenStoryAdmin) {
      return null;
    }
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="w-full py-2">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <button
              onClick={onOpenStoryAdmin}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-purple-400 bg-purple-50/70 hover:bg-purple-100 text-purple-900 text-xs font-bold transition cursor-pointer"
              title="إدارة ونشر الستوريات الإعلانية (خاص بالمدير)"
            >
              <Plus className="w-4 h-4 text-purple-700" />
              <span>+ نشر أول ستوري للمنصة (خاص بالمدير)</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-full overflow-hidden">
        {/* Stories Horizontal Tray - 5 Circular Stories System */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar py-2 px-1 max-w-full">
        {/* Admin Quick Add Story Action (Strictly Admin Only) */}
        {isAdmin && onOpenStoryAdmin && (
          <button
            onClick={onOpenStoryAdmin}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
            title="إدارة ونشر الستوريات الإعلانية (خاص بالمدير)"
          >
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-dashed border-purple-500 bg-purple-50/80 group-hover:bg-purple-100 flex items-center justify-center transition-all shadow-xs">
              <Plus className="w-6 h-6 text-purple-700" />
            </div>
            <span className="text-[11px] font-bold text-purple-900 truncate max-w-[70px]">
              + ستوري جديد
            </span>
          </button>
        )}

        {/* Stories List (Strictly Maximum 5 Stories) */}
        {stories.slice(0, 5).map((story, idx) => (
          <button
            key={story.id}
            onClick={() => setActiveStoryIndex(idx)}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none select-none"
          >
            {/* Story Circle with Purple Gradient Rings and Motion Shimmer */}
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2.5px] bg-gradient-to-tr from-purple-950 via-purple-600 to-purple-400 shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform duration-300 ring-2 ring-purple-500/25 ring-offset-2">
              <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-zinc-950 relative">
                {story.mediaType === 'video' ? (
                  <div className="w-full h-full relative">
                    <video
                      src={story.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={story.mediaUrl}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-zinc-800 group-hover:text-purple-900 transition-colors truncate max-w-[76px] text-center">
              {story.title}
            </span>
          </button>
        ))}
      </div>

      {/* Fullscreen Interactive Story Viewer */}
      {currentStory && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
          onClick={() => setActiveStoryIndex(null)}
        >
          {/* Story Container */}
          <div
            className="relative w-full h-full sm:max-w-sm sm:h-[85vh] sm:rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Top Progress Bars */}
            <div className="absolute top-0 inset-x-0 z-30 p-3.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent space-y-2.5">
              <div className="flex items-center gap-1.5">
                {stories.slice(0, 5).map((s, idx) => {
                  let fillPercent = 0;
                  if (idx < (activeStoryIndex || 0)) fillPercent = 100;
                  else if (idx === activeStoryIndex) fillPercent = storyProgress;

                  return (
                    <div
                      key={s.id}
                      className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-white transition-all duration-75"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Header */}
              <div className="flex items-center justify-between text-white pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-700 border border-white/20 flex items-center justify-center font-black text-xs">
                    د
                  </div>
                  <div>
                    <h3 className="font-black text-xs leading-tight">{currentStory.title}</h3>
                    <span className="text-[10px] text-purple-200">ستوريات دُكَّانَة المعتمدة</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveStoryIndex(null)}
                  className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer"
                  aria-label="إغلاق الستوري"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Media Content */}
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {currentStory.mediaType === 'video' ? (
                <video
                  src={currentStory.mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                  loop
                />
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt={currentStory.title}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Touch Nav Zones */}
              <div
                className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
                onClick={handlePrevStory}
                title="السابق"
              />
              <div
                className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                onClick={handleNextStory}
                title="التالي"
              />
            </div>

            {/* Bottom Call To Action (CTA) Button */}
            <div className="absolute bottom-0 inset-x-0 z-30 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  if (onSelectProduct) {
                    onSelectProduct(currentStory.productId);
                  }
                  fetch(`/api/stories/${currentStory.id}/click`, { method: 'POST' }).catch(() => {});
                  onClose();
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-800 via-purple-700 to-purple-600 hover:from-purple-900 hover:to-purple-700 text-white font-black text-sm shadow-xl shadow-purple-950/40 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer border border-purple-400/30 active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>{currentStory.ctaText || 'تسوّق الآن في دكانة'}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-zinc-300">
                انقر زر (تسوّق الآن) لفتح صفحة وتفاصيل المنتج فوراً
              </span>
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  );
};
