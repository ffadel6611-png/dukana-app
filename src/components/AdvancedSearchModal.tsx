import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Filter,
  RotateCcw,
  Sparkles,
  Flame,
  Briefcase,
  Car,
  Building2,
  Smartphone,
  Store,
  MapPin,
  Clock,
  Phone,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  Tag,
  DollarSign,
  User,
  Send,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { Product, IraqiGovernorate, JobVacancy } from '../types';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { MODERN_CATEGORIES, INITIAL_JOB_VACANCIES } from '../data/categoriesData';
import { ProductCard } from './ProductCard';
import { formatIQDTabular } from '../utils/currency';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onSelectProduct: (product: Product) => void;
  onOpenStore?: (merchantId: string) => void;
  onOpenChatWithEmployer?: (merchantId: string, jobTitle: string) => void;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'all',
  onSelectProduct,
  onOpenStore,
  onOpenChatWithEmployer,
}) => {
  const { products, merchants } = useMarket();

  // Search input state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Smart Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialTab && initialTab !== 'all' && initialTab !== 'trending' && initialTab !== 'jobs-careers'
      ? initialTab
      : 'all'
  );
  const [selectedGov, setSelectedGov] = useState<IraqiGovernorate | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'new' | 'used'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(50000000); // Up to 50M IQD
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);

  // Job Application Modal State
  const [selectedJobToApply, setSelectedJobToApply] = useState<JobVacancy | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantNotes, setApplicantNotes] = useState('');
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [applySuccessNotice, setApplySuccessNotice] = useState<string | null>(null);

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
        if (
          initialTab !== 'all' &&
          initialTab !== 'trending' &&
          initialTab !== 'jobs-careers' &&
          initialTab !== 'stores'
        ) {
          setSelectedCategory(initialTab);
        }
      }
    }
  }, [isOpen, initialTab]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedGov('all');
    setConditionFilter('all');
    setMaxPrice(50000000);
    setActiveTab('all');
  };

  // Filter products according to all active criteria
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Text search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesStore = p.storeName?.toLowerCase().includes(q);
        const matchesTags = p.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesStore && !matchesTags) {
          return false;
        }
      }

      // 2. Tab filter
      if (activeTab === 'trending') {
        const isTrending = p.isPromoted || p.featured || (p.discountPercent || 0) >= 20 || (p.viewsCount || 0) > 200;
        if (!isTrending) return false;
      } else if (activeTab === 'cars-vehicles') {
        if (p.categoryId !== 'cat_vehicles' && !p.categoryName?.includes('سيارات')) return false;
      } else if (activeTab === 'real-estate-sale' || activeTab === 'real-estate-rent') {
        if (p.categoryId !== 'cat_real_estate') return false;
      } else if (activeTab === 'mobiles-tablets') {
        if (p.categoryId !== 'cat_mobiles' && !p.name?.includes('آيفون')) return false;
      }

      // 3. Category filter dropdown
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'cars-vehicles' && p.categoryId !== 'cat_vehicles') return false;
        if (selectedCategory === 'motorcycles' && p.categoryId !== 'cat_motorcycles' && !p.name?.includes('دراجة')) return false;
        if ((selectedCategory === 'real-estate-sale' || selectedCategory === 'real-estate-rent') && p.categoryId !== 'cat_real_estate') return false;
        if (selectedCategory === 'mobiles-tablets' && p.categoryId !== 'cat_mobiles') return false;
        if (selectedCategory === 'laptops-computers' && p.categoryId !== 'cat_laptops') return false;
        if (selectedCategory === 'home-appliances' && p.categoryId !== 'cat_appliances') return false;
        if (selectedCategory === 'home-garden' && p.categoryId !== 'cat_home') return false;
        if (selectedCategory === 'fashion-kids' && p.categoryId !== 'cat_clothing') return false;
        if (selectedCategory === 'food-groceries' && p.categoryId !== 'cat_food' && p.categoryId !== 'cat_restaurants') return false;
        if (selectedCategory === 'services-maintenance' && p.categoryId !== 'cat_services') return false;
        if (selectedCategory === 'sports-fitness' && p.categoryId !== 'cat_sports') return false;
      }

      // 4. Governorate filter
      if (selectedGov !== 'all') {
        if (p.governorate && p.governorate !== selectedGov) return false;
      }

      // 5. Condition filter (جديد أو مستعمل)
      if (conditionFilter !== 'all') {
        const pCondition = p.condition || 'new';
        if (pCondition !== conditionFilter) return false;
      }

      // 6. Price Slider Filter
      if (p.finalPrice > maxPrice) {
        return false;
      }

      return true;
    });
  }, [products, searchTerm, activeTab, selectedCategory, selectedGov, conditionFilter, maxPrice]);

  // Trending & Featured Showcase items
  const trendingList = useMemo(() => {
    return products.filter(p => p.isPromoted || p.featured || (p.discountPercent || 0) >= 20).slice(0, 6);
  }, [products]);

  // Filter Jobs
  const filteredJobs = useMemo(() => {
    return INITIAL_JOB_VACANCIES.filter(job => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mTitle = job.title.toLowerCase().includes(q);
        const mComp = job.companyName.toLowerCase().includes(q);
        const mDesc = job.description.toLowerCase().includes(q);
        if (!mTitle && !mComp && !mDesc) return false;
      }
      if (selectedGov !== 'all' && job.governorate !== selectedGov) {
        return false;
      }
      return true;
    });
  }, [searchTerm, selectedGov]);

  const handleApplyToJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobToApply || !applicantName.trim() || !applicantPhone.trim()) return;

    setAppliedJobs(prev => new Set(prev).add(selectedJobToApply.id));
    setApplySuccessNotice(`تم إرسال طلب تقديمك على وظيفة "${selectedJobToApply.title}" بنجاح! سيتواصل معك صاحب العمل قريباً.`);
    setSelectedJobToApply(null);
    setApplicantName('');
    setApplicantPhone('');
    setApplicantNotes('');

    setTimeout(() => {
      setApplySuccessNotice(null);
    }, 6000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4 border border-zinc-200 max-h-[92vh] flex flex-col">
        {/* Top Header & Search Input */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-white space-y-3.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-950">
                  البحث والفلترة المتقدمة في دكانة
                </h2>
                <p className="text-xs text-zinc-500">
                  بحث مباشر، ميزانية بالدينار العراقي، عقارات، سيارات، ووظائف شاغرة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-2xl transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Wide Search Bar Input */}
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-purple-700">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="اكتب اسم السلعة، الموديل، الوظيفة، أو المحافظة..."
              className="w-full pr-11 pl-10 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                title="مسح"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Top Quick Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              جميع النتائج ({filteredProducts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trending')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'trending'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>الأكثر تفاعلاً والرائجة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('jobs-careers')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'jobs-careers'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-600" />
              <span>وظائف شاغرة ({filteredJobs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cars-vehicles');
                setSelectedCategory('cars-vehicles');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'cars-vehicles'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>سيارات ومركبات</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('real-estate-sale');
                setSelectedCategory('real-estate-sale');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'real-estate-sale'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>عقارات</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('mobiles-tablets');
                setSelectedCategory('mobiles-tablets');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'mobiles-tablets'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>موبايل وإلكترونيات</span>
            </button>
          </div>
        </div>

        {/* Success Notice Toast */}
        {applySuccessNotice && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-900 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{applySuccessNotice}</span>
          </div>
        )}

        {/* Body Container: Split into Filters Panel + Results Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col lg:flex-row gap-5">
          {/* Smart Filters Panel */}
          {activeTab !== 'jobs-careers' && (
            <div className="w-full lg:w-72 shrink-0 space-y-4">
              <div className="bg-zinc-50/90 rounded-3xl p-4 sm:p-5 border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <div className="flex items-center gap-1.5 font-black text-xs text-zinc-900">
                    <SlidersHorizontal className="w-4 h-4 text-purple-700" />
                    <span>فلاتر البحث الذكية</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة ضبط</span>
                  </button>
                </div>

                {/* 1. Price Budget Slider (Requirement 2) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-purple-700" />
                      <span>الميزانية القصوى:</span>
                    </span>
                    <span className="font-black text-purple-900 text-xs tabular-nums bg-purple-100 px-2 py-0.5 rounded-lg">
                      {maxPrice >= 50000000 ? 'مفتوح (أي سعر)' : `${formatIQDTabular(maxPrice)}`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="50000"
                    max="50000000"
                    step="50000"
                    value={maxPrice}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
                  />

                  {/* Preset quick budget chips */}
                  <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                    <button
                      type="button"
                      onClick={() => setMaxPrice(50000)}
                      className="px-2 py-1 bg-white hover:bg-zinc-200 rounded-lg border border-zinc-200 cursor-pointer font-medium"
                    >
                      50 ألف
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxPrice(250000)}
                      className="px-2 py-1 bg-white hover:bg-zinc-200 rounded-lg border border-zinc-200 cursor-pointer font-medium"
                    >
                      250 ألف
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxPrice(1000000)}
                      className="px-2 py-1 bg-white hover:bg-zinc-200 rounded-lg border border-zinc-200 cursor-pointer font-medium"
                    >
                      1 مليون
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxPrice(5000000)}
                      className="px-2 py-1 bg-white hover:bg-zinc-200 rounded-lg border border-zinc-200 cursor-pointer font-medium"
                    >
                      5 مليون
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxPrice(50000000)}
                      className="px-2 py-1 bg-white hover:bg-zinc-200 rounded-lg border border-zinc-200 cursor-pointer font-medium"
                    >
                      الكل
                    </button>
                  </div>
                </div>

                {/* 2. Category Selector */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200/60">
                  <label className="text-xs font-bold text-zinc-800 block">
                    القسم الرئيسي:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={e => {
                      setSelectedCategory(e.target.value);
                      setActiveTab(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-hidden focus:border-purple-600 cursor-pointer"
                  >
                    <option value="all">كافة الأقسام</option>
                    {MODERN_CATEGORIES.map(c => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Iraqi Governorate Selector */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200/60">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-purple-700" />
                    <span>المدينة / المحافظة:</span>
                  </label>
                  <select
                    value={selectedGov}
                    onChange={e => setSelectedGov(e.target.value as IraqiGovernorate | 'all')}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-hidden focus:border-purple-600 cursor-pointer"
                  >
                    <option value="all">كافة محافظات العراق (19)</option>
                    {IRAQI_GOVERNORATES.map(gov => (
                      <option key={gov.id} value={gov.id}>
                        {gov.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Condition Filter (جديد أو مستعمل) */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200/60">
                  <label className="text-xs font-bold text-zinc-800 block">
                    حالة السلعة / المنتج:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setConditionFilter('all')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        conditionFilter === 'all'
                          ? 'bg-purple-700 text-white'
                          : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setConditionFilter('new')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        conditionFilter === 'new'
                          ? 'bg-purple-700 text-white'
                          : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                      }`}
                    >
                      جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => setConditionFilter('used')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        conditionFilter === 'used'
                          ? 'bg-purple-700 text-white'
                          : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                      }`}
                    >
                      مستعمل
                    </button>
                  </div>
                </div>

                {/* Instant Result Counter */}
                <div className="pt-2 text-center text-xs text-zinc-500 font-bold border-t border-zinc-200/60">
                  {filteredProducts.length} نتيجة متطابقة
                </div>
              </div>
            </div>
          )}

          {/* Results Display Area */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* If in Dedicated Jobs Tab (Requirement 2.3) */}
            {activeTab === 'jobs-careers' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <div>
                    <h3 className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-amber-600" />
                      <span>فرص العمل والوظائف الشاغرة في العراق</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      وظائف مباشرة من أصحاب العمل والشركات في بغداد وكافة المحافظات
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    {filteredJobs.length} فرصة متاحة
                  </span>
                </div>

                {filteredJobs.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400 space-y-2">
                    <Briefcase className="w-10 h-10 mx-auto text-zinc-300" />
                    <p className="font-bold text-zinc-700 text-xs">لا توجد وظائف مطابقة لبحثك</p>
                    <p className="text-[11px] text-zinc-400">جرّب تغيير كلمات البحث أو اختيار كافة المحافظات.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredJobs.map(job => {
                      const isApplied = appliedJobs.has(job.id);
                      return (
                        <div
                          key={job.id}
                          className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200 hover:border-amber-300 transition shadow-xs hover:shadow-md flex flex-col justify-between space-y-3.5 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200 mb-1">
                                  {job.jobType}
                                </span>
                                <h4 className="font-black text-sm text-zinc-900 group-hover:text-purple-700 transition">
                                  {job.title}
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shrink-0">
                                {job.salaryRange}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                              <span className="font-semibold text-zinc-700">{job.companyName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="flex items-center gap-1 text-zinc-500">
                                <MapPin className="w-3 h-3 text-amber-600" />
                                <span>{job.governorate}</span>
                              </span>
                            </div>

                            <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                              {job.description}
                            </p>

                            {/* Requirements tags */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {job.requirements.map((req, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-medium"
                                >
                                  ✓ {req}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons: Apply & Chat */}
                          <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isApplied}
                              onClick={() => setSelectedJobToApply(job)}
                              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                                isApplied
                                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                  : 'bg-purple-700 hover:bg-purple-800 text-white'
                              }`}
                            >
                              {isApplied ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>تم التقديم</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>التقديم على الوظيفة</span>
                                </>
                              )}
                            </button>

                            {onOpenChatWithEmployer && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenChatWithEmployer(job.merchantId || 'usr_admin', job.title)
                                }
                                className="py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                                title="محادثة صاحب العمل مباشرة"
                              >
                                <Phone className="w-3 h-3 text-purple-700" />
                                <span className="hidden sm:inline">استفسار</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Products and Advertisements Grid */
              <div className="space-y-6">
                {/* Trending & Featured strip (if activeTab is trending or all with no text) */}
                {(activeTab === 'trending' || (!searchTerm && selectedCategory === 'all')) && (
                  <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 rounded-3xl border border-purple-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-zinc-900">
                        <Flame className="w-4 h-4 text-rose-600 fill-rose-600" />
                        <span>الأكثر طلباً وتفاعلاً في سوق دكانة (Trending)</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200">
                        عروض مميزة
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      {trendingList.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            onClose();
                            onSelectProduct(prod);
                          }}
                          className="bg-white p-2.5 rounded-2xl border border-zinc-200/80 hover:border-purple-300 transition cursor-pointer shadow-2xs hover:shadow-sm space-y-1.5"
                        >
                          <div className="aspect-square rounded-xl overflow-hidden bg-zinc-100 relative">
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                            {prod.discountPercent && (
                              <span className="absolute top-1.5 right-1.5 bg-rose-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-md">
                                -{prod.discountPercent}%
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-zinc-900 truncate">{prod.name}</h4>
                          <span className="font-black text-xs text-purple-700 block">
                            {formatIQDTabular(prod.finalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtered Products Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-black text-zinc-900">
                      نتائج البحث المتاحة ({filteredProducts.length})
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      الدفع نقداً عند الاستلام لجميع محافظات العراق
                    </span>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400 space-y-3 bg-zinc-50 rounded-3xl border border-zinc-200">
                      <Search className="w-10 h-10 mx-auto text-zinc-300" />
                      <p className="font-bold text-zinc-700 text-xs">لم نتمكن من العثور على سلع مطابقة</p>
                      <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                        جرّب رفع سقف الميزانية بالـ Slider، أو اختيار "كافة الأقسام" أو "كافة المحافظات".
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-purple-700 text-white rounded-xl font-bold text-xs hover:bg-purple-800 transition cursor-pointer"
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {filteredProducts.map(prod => (
                        <ProductCard
                          key={prod.id}
                          product={prod}
                          onSelectProduct={p => {
                            onClose();
                            onSelectProduct(p);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Job Application Modal */}
      {selectedJobToApply && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-xs" dir="rtl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-700" />
                <h4 className="font-black text-sm text-zinc-900">
                  التقديم على: {selectedJobToApply.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobToApply(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 space-y-1 text-[11px]">
              <div className="font-bold text-purple-900">{selectedJobToApply.companyName}</div>
              <div className="text-purple-700">الراتب المتوقع: {selectedJobToApply.salaryRange}</div>
              <div className="text-zinc-500">المحافظة: {selectedJobToApply.governorate}</div>
            </div>

            <form onSubmit={handleApplyToJob} className="space-y-3">
              <div>
                <label className="font-bold text-zinc-800 block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  placeholder="مثال: علي كريم البصري"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 focus:bg-white focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">رقم الهاتف العراقي للتواصل *</label>
                <input
                  type="tel"
                  required
                  value={applicantPhone}
                  onChange={e => setApplicantPhone(e.target.value)}
                  placeholder="مثال: 07701234567"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 focus:bg-white focus:border-purple-600"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">نبذة عن خبرتك أو ملاحظات</label>
                <textarea
                  rows={2}
                  value={applicantNotes}
                  onChange={e => setApplicantNotes(e.target.value)}
                  placeholder="اذكر سنوات خبرتك ومؤهلك العلمي بإيجاز..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 focus:bg-white focus:border-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobToApply(null)}
                  className="px-4 py-2 border rounded-xl text-zinc-600 hover:bg-zinc-50 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>تأكيد التقديم الفوري</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
