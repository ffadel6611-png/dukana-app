import React from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Car,
  Building2,
  Briefcase,
  Wrench,
  Smartphone,
  Laptop,
  Tv,
  Shirt,
  UtensilsCrossed,
  Store,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { QUICK_SEARCH_TABS } from '../data/categoriesData';

interface HomeSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAdvancedSearch: (initialTab?: string) => void;
  selectedCategorySlug?: string;
  onSelectCategorySlug?: (slug: string) => void;
}

export const HomeSearchBar: React.FC<HomeSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAdvancedSearch,
  selectedCategorySlug = 'all',
  onSelectCategorySlug,
}) => {
  const getTabIcon = (iconName: string) => {
    const props = { className: 'w-3.5 h-3.5 shrink-0 stroke-[2.2]' };
    switch (iconName) {
      case 'Car': return <Car {...props} />;
      case 'Building2': return <Building2 {...props} />;
      case 'Briefcase': return <Briefcase {...props} />;
      case 'Wrench': return <Wrench {...props} />;
      case 'Smartphone': return <Smartphone {...props} />;
      case 'Laptop': return <Laptop {...props} />;
      case 'Tv': return <Tv {...props} />;
      case 'Shirt': return <Shirt {...props} />;
      case 'UtensilsCrossed': return <UtensilsCrossed {...props} />;
      case 'Store': return <Store {...props} />;
      default: return <LayoutGrid {...props} />;
    }
  };

  const handleTabClick = (slug: string) => {
    if (onSelectCategorySlug) {
      onSelectCategorySlug(slug);
    }
    onOpenAdvancedSearch(slug);
  };

  return (
    <div className="w-full space-y-3" dir="rtl">
      {/* Wide Search Bar Card */}
      <div className="relative group bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/90 shadow-md shadow-zinc-950/5 hover:border-purple-300 transition duration-200 p-2 sm:p-2.5">
        <div className="flex items-center gap-2">
          {/* Search Icon */}
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 stroke-[2.2]" />
          </div>

          {/* Interactive Input trigger */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onClick={() => onOpenAdvancedSearch()}
            onFocus={() => onOpenAdvancedSearch()}
            placeholder="ابحث في سوق دكانة (سيارات، عقارات، وظائف، إلكترونيات، ملابس، خدمات...)"
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden font-medium cursor-pointer"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSearchChange('');
              }}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Advanced Search & Filters Action Button */}
          <button
            type="button"
            onClick={() => onOpenAdvancedSearch()}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="فتح صفحة البحث والفلترة المتقدمة"
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
            <span className="hidden sm:inline">بحث وفلترة متقدمة</span>
            <span className="sm:hidden">فلترة</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Quick Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 px-0.5">
        <span className="text-[11px] font-bold text-zinc-400 shrink-0 ml-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>تصفح سريع:</span>
        </span>

        {QUICK_SEARCH_TABS.map(tab => {
          const isActive = selectedCategorySlug === tab.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => handleTabClick(tab.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer select-none border shrink-0 ${
                isActive
                  ? 'bg-purple-700 text-white border-purple-700 shadow-2xs shadow-purple-700/20'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 hover:text-purple-700 border-zinc-200/80 hover:border-purple-200'
              }`}
            >
              {getTabIcon(tab.icon)}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
