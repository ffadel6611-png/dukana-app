import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowRight,
  TrendingUp,
  Flame,
  Briefcase,
  Store,
  MapPin,
  Sparkles,
  Phone,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  RotateCcw,
  Tag,
  Building2,
  Car,
  Bike,
  Smartphone,
  Laptop,
  Tv,
  Gamepad2,
  Home,
  Shirt,
  Wrench,
  UtensilsCrossed,
  LayoutGrid,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { Product, IraqiGovernorate, JobVacancy, UserRole } from '../types';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { ProductCard } from './ProductCard';
import { smartArabicSearchMatch } from '../utils/arabicSearch';
import { MODERN_CATEGORIES_CONFIG } from './ModernCategoriesGrid';

interface AdvancedSearchViewProps {
  onSelectProduct: (product: Product) => void;
  onOpenStore?: (merchantId: string) => void;
  onOpenChat?: (recipientId?: string, recipientRole?: UserRole, recipientName?: string) => void;
  onBackToHome?: () => void;
  initialCategorySlug?: string;
  initialQuery?: string;
  initialTab?: 'products' | 'jobs' | 'stores';
}

export const AdvancedSearchView: React.FC<AdvancedSearchViewProps> = ({
  onSelectProduct,
  onOpenStore,
  onOpenChat,
  onBackToHome,
  initialCategorySlug = 'all',
  initialQuery = '',
  initialTab = 'products',
}) => {
  const {
    products,
    merchants,
    jobs,
    applyForJob,
  } = useMarket();

  // Primary Search & Filter State
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategorySlug);
  const [activeTab, setActiveTab] = useState<'products' | 'jobs' | 'stores'>(
    initialCategorySlug === 'jobs-careers' ? 'jobs' : initialCategorySlug === 'stores' ? 'stores' : initialTab
  );
  const [selectedGovernorate, setSelectedGovernorate] = useState<IraqiGovernorate | 'all'>('all');
  const [selectedCondition, setSelectedCondition] = useState<'all' | 'new' | 'used'>('all');
  const [minPrice, setMinPrice] = useState<number>(1000); // 1,000 IQD minimum
  const [maxPrice, setMaxPrice] = useState<number>(250000000); // 250,000,000 IQD (250 Million) max
  const [sortBy, setSortBy] = useState<'trending' | 'price_asc' | 'price_desc' | 'newest'>('trending');
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);

  // Job Application Modal State
  const [activeJobModal, setActiveJobModal] = useState<JobVacancy | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantNotes, setApplicantNotes] = useState('');
  const [applicationSuccessMsg, setApplicationSuccessMsg] = useState<string | null>(null);

  // Quick preset tabs
  const QUICK_TABS = [
    { slug: 'all', label: 'جميع الإعلانات', icon: <LayoutGrid className="w-4 h-4" /> },
    { slug: 'cars-vehicles', label: 'سيارات ومركبات', icon: <Car className="w-4 h-4" /> },
    { slug: 'real-estate-sale', label: 'عقارات للبيع', icon: <Building2 className="w-4 h-4" /> },
    { slug: 'real-estate-rent', label: 'عقارات للإيجار', icon: <Home className="w-4 h-4" /> },
    { slug: 'jobs-careers', label: 'وظائف شاغرة', icon: <Briefcase className="w-4 h-4" /> },
    { slug: 'services-maintenance', label: 'خدمات وصيانة', icon: <Wrench className="w-4 h-4" /> },
    { slug: 'mobiles-tablets', label: 'موبايلات وتابلت', icon: <Smartphone className="w-4 h-4" /> },
    { slug: 'laptops-computers', label: 'لابتوبات وكمبيوتر', icon: <Laptop className="w-4 h-4" /> },
    { slug: 'home-appliances', label: 'أجهزة منزلية', icon: <Tv className="w-4 h-4" /> },
    { slug: 'fashion-kids', label: 'موضة وأزياء', icon: <Shirt className="w-4 h-4" /> },
    { slug: 'stores', label: 'المتاجر والشركات', icon: <Store className="w-4 h-4" /> },
  ];

  // Reset Filters
  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setSelectedGovernorate('all');
    setSelectedCondition('all');
    setMinPrice(1000);
    setMaxPrice(250000000);
    setSortBy('trending');
    setActiveTab('products');
  };

  // Switch category and sync tab
  const handleSelectCategory = (slug: string) => {
    setSelectedCategory(slug);
    if (slug === 'jobs-careers') {
      setActiveTab('jobs');
    } else if (slug === 'stores') {
      setActiveTab('stores');
    } else {
      setActiveTab('products');
    }
  };

  // Filtered Products Calculation
  const filteredProducts = useMemo(() => {
    const approvedMerchantIds = new Set(
      merchants.filter(m => m.status === 'approved').map(m => m.id)
    );

    let list = products.filter(
      p => p.approvalStatus === 'approved' && approvedMerchantIds.has(p.merchantId)
    );

    // 1. Governorate Filter
    if (selectedGovernorate !== 'all') {
      const merchantsInGov = new Set(
        merchants.filter(m => m.governorate === selectedGovernorate).map(m => m.id)
      );
      list = list.filter(p => p.governorate === selectedGovernorate || merchantsInGov.has(p.merchantId));
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter(p => {
        const pName = p.name.toLowerCase();
        const pTags = (p.tags || []).join(' ').toLowerCase();
        const pCategory = p.categoryName.toLowerCase();
        switch (selectedCategory) {
          case 'real-estate-sale':
            return (p.categoryId === 'cat_real_estate' || pCategory.includes('عقار')) &&
              (pName.includes('بيع') || pTags.includes('بيع') || pName.includes('دار') || pName.includes('بيت'));
          case 'real-estate-rent':
            return (p.categoryId === 'cat_real_estate' || pCategory.includes('عقار')) &&
              (pName.includes('إيجار') || pName.includes('ايجار') || pTags.includes('إيجار') || pName.includes('شقة'));
          case 'cars-vehicles':
            return p.categoryId === 'cat_vehicles' || pCategory.includes('سيار') || pCategory.includes('مركب');
          case 'motorcycles':
            return p.categoryId === 'cat_motorcycles' || pCategory.includes('دراج') || pName.includes('بطاحة');
          case 'mobiles-tablets':
            return p.categoryId === 'cat_mobiles' || pCategory.includes('موبايل') || pCategory.includes('هاتف');
          case 'electronics':
            return p.categoryId === 'cat_electronics' || p.categoryId === 'cat_mobiles' || pCategory.includes('إلكترون');
          case 'laptops-computers':
            return p.categoryId === 'cat_laptops' || pCategory.includes('لابتوب') || pCategory.includes('كمبيوتر');
          case 'gaming-video':
            return p.categoryId === 'cat_gaming' || pTags.includes('بلايستيشن') || pTags.includes('ألعاب') || pTags.includes('ps5');
          case 'sports-equipment':
            return p.categoryId === 'cat_sports' || pCategory.includes('رياض') || pTags.includes('لياقة');
          case 'home-appliances':
            return p.categoryId === 'cat_appliances' || pCategory.includes('أجهزة') || pName.includes('سبلت');
          case 'home-garden':
            return p.categoryId === 'cat_home' || pCategory.includes('منزل') || pCategory.includes('أثاث');
          case 'fashion-kids':
            return p.categoryId === 'cat_fashion' || p.categoryId === 'cat_clothing' || pCategory.includes('ملابس') || pCategory.includes('أزياء');
          case 'beauty-health':
            return p.categoryId === 'cat_beauty' || p.categoryId === 'cat_daily_needs' || pTags.includes('بخور') || pCategory.includes('جمال');
          case 'food-groceries':
            return p.categoryId === 'cat_food' || p.categoryId === 'cat_restaurants' || pCategory.includes('غذائ') || pCategory.includes('مطاعم');
          case 'services-maintenance':
            return p.categoryId === 'cat_services' || pCategory.includes('صيانة') || pCategory.includes('خدمات');
          default:
            return p.categoryId === selectedCategory;
        }
      });
    }

    // 3. Condition Filter (New / Used)
    if (selectedCondition !== 'all') {
      list = list.filter(p => {
        const cond = p.condition || 'new';
        return cond === selectedCondition;
      });
    }

    // 4. Price Slider & Inputs Filter (1,000 IQD to 250,000,000 IQD)
    if (minPrice > 1000) {
      list = list.filter(p => p.finalPrice >= minPrice);
    }
    if (maxPrice < 250000000) {
      list = list.filter(p => p.finalPrice <= maxPrice);
    }

    // 5. Smart Search Query
    if (query.trim()) {
      list = list
        .map(product => {
          const searchFields = [
            product.name,
            product.description,
            product.storeName,
            product.categoryName,
            ...(product.tags || []),
          ];
          const matchResult = smartArabicSearchMatch(searchFields, query);
          return { product, matchResult };
        })
        .filter(item => item.matchResult.matches)
        .map(item => item.product);
    }

    // 6. Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'trending') {
        const scoreA = (a.isPromoted ? 1000 : 0) + (a.viewsCount || 0) + (a.featured ? 500 : 0);
        const scoreB = (b.isPromoted ? 1000 : 0) + (b.viewsCount || 0) + (b.featured ? 500 : 0);
        return scoreB - scoreA;
      }
      if (sortBy === 'price_asc') {
        return a.finalPrice - b.finalPrice;
      }
      if (sortBy === 'price_desc') {
        return b.finalPrice - a.finalPrice;
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return list;
  }, [products, merchants, selectedGovernorate, selectedCategory, selectedCondition, maxPrice, query, sortBy]);

  // Featured / Trending Highlight list (الأكثر تفاعلاً والأبرز)
  const trendingProducts = useMemo(() => {
    return products
      .filter(p => p.approvalStatus === 'approved' && (p.isPromoted || p.featured || (p.viewsCount || 0) > 200))
      .slice(0, 4);
  }, [products]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (selectedGovernorate !== 'all') {
      list = list.filter(j => j.governorate === selectedGovernorate);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        j =>
          j.title.toLowerCase().includes(q) ||
          j.companyName.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, selectedGovernorate, query]);

  // Filtered Stores
  const filteredStores = useMemo(() => {
    let list = merchants.filter(m => m.status === 'approved');
    if (selectedGovernorate !== 'all') {
      list = list.filter(m => m.governorate === selectedGovernorate);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        m =>
          m.storeName.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [merchants, selectedGovernorate, query]);

  // Handle Job Application Submit
  const handleApplyJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobModal || !applicantName.trim() || !applicantPhone.trim()) return;

    const res = applyForJob(activeJobModal.id, applicantName, applicantPhone, applicantNotes);
    setApplicationSuccessMsg(res.message);
    setTimeout(() => {
      setApplicationSuccessMsg(null);
      setActiveJobModal(null);
      setApplicantName('');
      setApplicantPhone('');
      setApplicantNotes('');
    }, 2800);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Top Search & Filter Bar Container */}
      <section className="bg-white border-b border-zinc-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 space-y-3">
          {/* Main Search Row */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="p-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:text-purple-700 hover:border-purple-300 bg-white transition cursor-pointer flex items-center gap-1 shrink-0"
                title="العودة للصفحة الرئيسية"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {/* Wide Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-purple-700">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ابحث عن سيارات، عقارات، وظائف، هواتف، أجهزة، أو متاجر..."
                className="w-full pr-11 pl-10 py-3 bg-zinc-100 hover:bg-white focus:bg-white rounded-2xl border border-transparent focus:border-purple-600 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-purple-600/15 transition font-medium"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`px-4 py-3 rounded-2xl border text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
                showFiltersPanel
                  ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-purple-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">خيارات الفلترة</span>
              {(selectedGovernorate !== 'all' || selectedCondition !== 'all' || maxPrice < 50000000 || selectedCategory !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>
          </div>

          {/* Quick Horizontal Scrollable Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {QUICK_TABS.map(tab => {
              const isSelected = selectedCategory === tab.slug && (tab.slug === 'jobs-careers' ? activeTab === 'jobs' : tab.slug === 'stores' ? activeTab === 'stores' : activeTab === 'products');
              return (
                <button
                  key={tab.slug}
                  onClick={() => handleSelectCategory(tab.slug)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Tabs (Products & Ads | Jobs Board | Stores) */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                setActiveTab('products');
                if (selectedCategory === 'jobs-careers' || selectedCategory === 'stores') {
                  setSelectedCategory('all');
                }
              }}
              className={`pb-2 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 border-b-2 -mb-2 ${
                activeTab === 'products'
                  ? 'border-purple-700 text-purple-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>المنتجات والإعلانات</span>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                {filteredProducts.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('jobs');
                setSelectedCategory('jobs-careers');
              }}
              className={`pb-2 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 border-b-2 -mb-2 ${
                activeTab === 'jobs'
                  ? 'border-purple-700 text-purple-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>الوظائف الشاغرة (فرص العمل)</span>
              <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-mono">
                {filteredJobs.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('stores');
                setSelectedCategory('stores');
              }}
              className={`pb-2 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 border-b-2 -mb-2 ${
                activeTab === 'stores'
                  ? 'border-purple-700 text-purple-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>المتاجر المعتمدة</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                {filteredStores.length}
              </span>
            </button>
          </div>

          {(selectedGovernorate !== 'all' || selectedCondition !== 'all' || minPrice > 1000 || maxPrice < 250000000 || selectedCategory !== 'all' || query) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        {/* Smart Filters Panel (Accordion/Collapsible) */}
        {showFiltersPanel && (
          <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Filter 1: Price Range Slider & Direct Inputs (1,000 IQD to 250,000,000 IQD) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-purple-700" />
                    <span>نطاق السعر والميزانية:</span>
                  </span>
                  <span className="text-purple-700 font-mono font-black text-[11px]">
                    {minPrice === 1000 && maxPrice >= 250000000
                      ? 'كافة الأسعار'
                      : `${minPrice.toLocaleString('ar-IQ')} - ${maxPrice.toLocaleString('ar-IQ')} د.ع`}
                  </span>
                </div>

                {/* Range Slider for Maximum Price */}
                <input
                  type="range"
                  min={1000}
                  max={250000000}
                  step={50000}
                  value={maxPrice}
                  onChange={e => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                  className="w-full accent-purple-700 cursor-pointer"
                  title="تحريك شريط الحد الأقصى للسعر"
                />

                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                  <span>1,000 د.ع</span>
                  <span>250 مليون د.ع</span>
                </div>

                {/* Direct Number Inputs for Min & Max in IQD */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">
                      الحد الأدنى (د.ع):
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={maxPrice}
                      value={minPrice}
                      onChange={e => setMinPrice(Math.max(1000, Math.min(Number(e.target.value) || 1000, maxPrice)))}
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-mono font-bold text-zinc-800 focus:outline-hidden focus:border-purple-600"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">
                      الحد الأقصى (د.ع):
                    </label>
                    <input
                      type="number"
                      min={minPrice}
                      max={250000000}
                      value={maxPrice}
                      onChange={e => setMaxPrice(Math.max(minPrice, Math.min(Number(e.target.value) || 250000000, 250000000)))}
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-mono font-bold text-purple-900 focus:outline-hidden focus:border-purple-600"
                      placeholder="250000000"
                    />
                  </div>
                </div>

                {/* Quick Presets for Iraqi Market (Retail, Cars, Real Estate, Wholesale) */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => { setMinPrice(1000); setMaxPrice(50000); }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer transition"
                  >
                    أقل من 50 ألف
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice(1000); setMaxPrice(500000); }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer transition"
                  >
                    حتى 500 ألف
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice(1000); setMaxPrice(5000000); }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer transition"
                  >
                    حتى 5 ملايين
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice(1000000); setMaxPrice(35000000); }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer transition"
                  >
                    سيارات (حتى 35م)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice(10000000); setMaxPrice(250000000); }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer transition"
                  >
                    عقارات وجملة (حتى 250م)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice(1000); setMaxPrice(250000000); }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer transition"
                  >
                    الكل (250 مليون د.ع)
                  </button>
                </div>
              </div>

              {/* Filter 2: Governorate Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-700" />
                  <span>المحافظة أو المدينة:</span>
                </label>
                <select
                  value={selectedGovernorate}
                  onChange={e => setSelectedGovernorate(e.target.value as IraqiGovernorate | 'all')}
                  className="w-full py-2.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 cursor-pointer"
                >
                  <option value="all">كافة محافظات العراق (19)</option>
                  {IRAQI_GOVERNORATES.map(gov => (
                    <option key={gov.id} value={gov.id}>
                      {gov.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Condition (جديد / مستعمل) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <span>حالة المنتج:</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setSelectedCondition('all')}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      selectedCondition === 'all'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setSelectedCondition('new')}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      selectedCondition === 'new'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    جديد
                  </button>
                  <button
                    onClick={() => setSelectedCondition('used')}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      selectedCondition === 'used'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    مستعمل
                  </button>
                </div>
              </div>

              {/* Filter 4: Sorting (ترتيب النتائج) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-purple-700" />
                  <span>ترتيب حسب:</span>
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full py-2.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 cursor-pointer"
                >
                  <option value="trending">الأكثر تفاعلاً والأبرز (Trending)</option>
                  <option value="price_asc">السعر: من الأدنى للأعلى</option>
                  <option value="price_desc">السعر: من الأعلى للأدنى</option>
                  <option value="newest">الأحدث نزولاً</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 1: Products & Ads */}
        {activeTab === 'products' && (
          <div className="space-y-8">
            {/* Trending & Featured Section (الأكثر تفاعلاً والأبرز) */}
            {!query && selectedCategory === 'all' && trendingProducts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-amber-100 text-amber-700">
                    <Flame className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-zinc-900">
                    الأكثر تفاعلاً والأبرز في العراق (Trending & Featured)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingProducts.map(p => (
                    <ProductCard
                      key={`trending-${p.id}`}
                      product={p}
                      onSelect={onSelectProduct}
                      onOpenStore={onOpenStore}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-zinc-900 flex items-center gap-2">
                <span>نتائج البحث والتصفح</span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60 font-mono">
                  {filteredProducts.length} إعلان
                </span>
              </h3>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200 p-8 space-y-3">
                <Search className="w-12 h-12 text-zinc-300 mx-auto" />
                <h4 className="text-base font-bold text-zinc-800">لم نجد نتائج مطابقة لخيارات الفلترة</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  جرب توسيع نطاق السعر أو اختيار محافظة أخرى أو مسح الكلمات الدلالية لمشاهدة بقية الإعلانات.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 bg-purple-700 text-white font-bold rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer"
                >
                  إعادة ضبط كافة الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onSelect={onSelectProduct}
                    onOpenStore={onOpenStore}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Jobs Vacancies Board (الوظائف الشاغرة والتقديم عليها) */}
        {activeTab === 'jobs' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-700" />
                  <span>فرص العمل والوظائف الشاغرة في العراق</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  تصفح شواغر التوظيف المعتمدة من كبرى الشركات والمتاجر العراقية مع إمكانية التقديم الفوري
                </p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                {filteredJobs.length} فرصة متاحة
              </span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200 p-8 space-y-3">
                <Briefcase className="w-12 h-12 text-zinc-300 mx-auto" />
                <h4 className="text-base font-bold text-zinc-800">لا توجد وظائف معلنة تطابق هذا البحث حالياً</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  اختر كافة المحافظات لمشاهدة كافة فرص العمل المتاحة في عموم العراق.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map(job => (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs hover:border-purple-300 transition hover:shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-zinc-900 leading-snug">
                          {job.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                          <span className="font-bold text-purple-700">{job.companyName}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                            {job.governorate}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-1 rounded-xl shrink-0">
                        {job.jobType}
                      </span>
                    </div>

                    {/* Salary & Details */}
                    <div className="p-3 bg-zinc-50 rounded-xl space-y-1.5 border border-zinc-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-medium">الراتب المتوقع:</span>
                        <span className="font-mono font-black text-emerald-700">{job.salaryRange}</span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed pt-1">
                        {job.description}
                      </p>
                    </div>

                    {/* Requirements */}
                    {job.requirements && job.requirements.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-zinc-700 block">المتطلبات الأساسية:</span>
                        <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
                          {job.requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center justify-between border-t border-zinc-100 gap-2">
                      <button
                        onClick={() => setActiveJobModal(job)}
                        className="flex-1 py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Briefcase className="w-4 h-4" />
                        <span>التقديم على الوظيفة</span>
                      </button>

                      <a
                        href={`tel:${job.contactPhone}`}
                        className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                        title="اتصال مباشر بالشركة"
                      >
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>اتصال</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Stores & Merchants Directory */}
        {activeTab === 'stores' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-700" />
                  <span>دليل المتاجر والشركات المعتمدة في دكانة</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  تسوق مباشرة من متاجر نخبة التجار العراقيين مع كفالة المنتجات والدفع عند الاستلام
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {filteredStores.length} متجر معتمد
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStores.map(store => {
                const storeProductsCount = products.filter(
                  p => p.merchantId === store.id && p.approvalStatus === 'approved'
                ).length;

                return (
                  <div
                    key={store.id}
                    className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs hover:border-purple-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-lg shadow-xs overflow-hidden">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.storeName} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900">{store.storeName}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{store.governorate}</span>
                          <span>·</span>
                          <span className="font-mono">{storeProductsCount} منتج</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {store.description}
                    </p>

                    <div className="pt-2 flex items-center gap-2 border-t border-zinc-100">
                      {onOpenStore && (
                        <button
                          onClick={() => onOpenStore(store.id)}
                          className="flex-1 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition cursor-pointer text-center"
                        >
                          تصفح المتجر
                        </button>
                      )}
                      {onOpenChat && (
                        <button
                          onClick={() => onOpenChat(store.id, 'merchant', store.storeName)}
                          className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          محادثة
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Job Application Modal (نافذة التقديم على الوظيفة) */}
      {activeJobModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h4 className="text-base font-black text-zinc-900">التقديم على الوظيفة</h4>
                <p className="text-xs text-purple-700 font-bold mt-0.5">{activeJobModal.title}</p>
              </div>
              <button
                onClick={() => setActiveJobModal(null)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applicationSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h5 className="text-sm font-bold text-zinc-900">{applicationSuccessMsg}</h5>
              </div>
            ) : (
              <form onSubmit={handleApplyJob} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 block">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={e => setApplicantName(e.target.value)}
                    placeholder="مثال: سيف أحمد التميمي"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 block">رقم الهاتف العراقي للتواصل *</label>
                  <input
                    type="tel"
                    required
                    value={applicantPhone}
                    onChange={e => setApplicantPhone(e.target.value)}
                    placeholder="0770xxxxxxx أو 0780xxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-mono focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 block">نبذة عن خبرتك ومؤهلاتك</label>
                  <textarea
                    rows={3}
                    value={applicantNotes}
                    onChange={e => setApplicantNotes(e.target.value)}
                    placeholder="اكتب باختصار سنوات خبرتك ومؤهلك العلمي وما يؤهلك لهذه الوظيفة..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveJobModal(null)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    إرسال طلب التقديم
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
