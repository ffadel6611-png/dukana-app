import React, { useState } from 'react';
import {
  Store,
  Plus,
  Package,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Upload,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  Star,
  ShieldCheck,
  Eye,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Loader2,
  Tag,
  Copy,
  Bell,
  Megaphone,
  FileText,
  Bookmark,
  Calendar,
  Calculator,
  Flame,
  PauseCircle,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import {
  Product,
  IraqiGovernorate,
  OrderStatus,
  ProductDraft,
  AdCampaignDraft,
  CommercialPromotion,
} from '../types';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { formatIQDTabular } from '../utils/currency';
import { compressImageFile } from '../utils/storage';
import { StoreDetailModal } from './StoreDetailModal';

interface MerchantDashboardProps {
  onOpenChat?: (recipientId?: string, recipientRole?: string, recipientName?: string) => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ onOpenChat }) => {
  const {
    products,
    merchants,
    orders,
    categories,
    reviews,
    settings,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    registerMerchantStore,
    updateMerchantStore,
    promoteProduct,
    unpromoteProduct,
    updateProductImages,
    updateStoreImages,
  } = useMarket();

  const { currentUser, isMerchant } = useAuth();

  // Find merchant's store with safe fallback
  const store =
    merchants.find(m => m.userId === currentUser?.id || m.id === currentUser?.merchantStoreId) ||
    merchants[0] || {
      id: 'merch_default',
      userId: currentUser?.id || 'usr_default',
      storeName: 'متجر جديد',
      description: 'متجر عراقي جديد',
      governorate: 'بغداد' as IraqiGovernorate,
      phone: currentUser?.phone || '07700000000',
      status: 'pending' as const,
      commissionRate: 5,
      createdAt: new Date().toISOString(),
    };

  // State for Add / Edit Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Multi-image state for product add/edit
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodPrimaryIndex, setProdPrimaryIndex] = useState<number>(0);

  // Dedicated "Manage Product Images" modal state
  const [managingImagesProduct, setManagingImagesProduct] = useState<Product | null>(null);
  const [manageImagesList, setManageImagesList] = useState<string[]>([]);
  const [manageImagesPrimaryIndex, setManageImagesPrimaryIndex] = useState<number>(0);
  const [manageImagesSuccessMsg, setManageImagesSuccessMsg] = useState('');

  // Store Images section state
  const [isAddStoreImageModalOpen, setIsAddStoreImageModalOpen] = useState(false);
  const [newStoreImageUrl, setNewStoreImageUrl] = useState('');
  const [storeImageError, setStoreImageError] = useState('');
  const [storeImagesSuccessMsg, setStoreImagesSuccessMsg] = useState('');
  const [isPreviewStoreOpen, setIsPreviewStoreOpen] = useState(false);

  // State for Edit Store Info Modal
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState(store?.storeName || '');
  const [storeDescInput, setStoreDescInput] = useState(store?.description || '');
  const [storeGovInput, setStoreGovInput] = useState<IraqiGovernorate>(store?.governorate || 'بغداد');
  const [storePhoneInput, setStorePhoneInput] = useState(store?.phone || '');
  const [storeModalSuccess, setStoreModalSuccess] = useState('');

  // State for Paid In-App Promotion Modal
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(null);
  const [promotionSuccessMsg, setPromotionSuccessMsg] = useState('');

  // Form fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState(categories[1]?.id || 'cat_food');
  const [prodInStock, setProdInStock] = useState(true);
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiToast, setAiToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [aiAnalysisSuccessMsg, setAiAnalysisSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Main Merchant Tab Navigation: Products, Campaigns & Promotions, Product Drafts, Campaign Drafts
  const [merchantTab, setMerchantTab] = useState<'products' | 'promotions' | 'product_drafts' | 'campaign_drafts'>('products');

  // Product Drafts State
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>(() => {
    try {
      const saved = localStorage.getItem(`dukkana_prod_drafts_${store.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftSuccessNotice, setDraftSuccessNotice] = useState('');

  // Ad Campaign Drafts State
  const [campaignDrafts, setCampaignDrafts] = useState<AdCampaignDraft[]>(() => {
    try {
      const saved = localStorage.getItem(`dukkana_camp_drafts_${store.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Commercial Promotions State & Active Campaigns
  const [commercialPromotions, setCommercialPromotions] = useState<CommercialPromotion[]>([]);
  const [campaignDurationDays, setCampaignDurationDays] = useState<number>(7);
  const [campaignProductId, setCampaignProductId] = useState<string>('');
  const [campaignNotes, setCampaignNotes] = useState<string>('');
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState<boolean>(false);
  const [campaignNotice, setCampaignNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [modalDurationDays, setModalDurationDays] = useState<number>(7);

  // Sync drafts and commercial promotions with backend on mount
  React.useEffect(() => {
    if (!store.id) return;

    fetch(`/api/drafts/products?merchantId=${store.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.drafts) && data.drafts.length > 0) {
          setProductDrafts(data.drafts);
        }
      })
      .catch(() => {});

    fetch(`/api/drafts/campaigns?merchantId=${store.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.drafts) && data.drafts.length > 0) {
          setCampaignDrafts(data.drafts);
        }
      })
      .catch(() => {});

    fetch(`/api/promotions/commercial?merchantId=${store.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.promotions) && data.promotions.length > 0) {
          setCommercialPromotions(data.promotions);
        }
      })
      .catch(() => {});
  }, [store.id]);

  // Marketing & Copywriting Assistant State (Instagram & TikTok)
  const [isGeneratingMarketingAd, setIsGeneratingMarketingAd] = useState(false);
  const [marketingAdCopy, setMarketingAdCopy] = useState('');
  const [isMarketingAdCopied, setIsMarketingAdCopied] = useState(false);
  const [showMarketingAdSection, setShowMarketingAdSection] = useState(false);

  if (!isMerchant) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-zinc-900">لوحة التاجر محمية</h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          هذه الصفحة مخصصة حصرياً للتجار المعتمدين في سوق دكانة لإدارة منتجاتهم ومبيعاتهم.
        </p>
      </div>
    );
  }

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeNameInput.trim()) return;
    updateMerchantStore(store.id, {
      storeName: storeNameInput.trim(),
      description: storeDescInput.trim(),
      governorate: storeGovInput,
      phone: storePhoneInput.trim(),
    });
    setStoreModalSuccess('تم تحديث معلومات المتجر بنجاح.');
    setTimeout(() => {
      setStoreModalSuccess('');
      setIsStoreModalOpen(false);
    }, 1200);
  };
  const storeProducts = products.filter(p => p.merchantId === store?.id);

  // Filter orders for this merchant only (strict multi-tenant boundary)
  const storeOrders = orders.filter(o => o.merchantId === store?.id);
  const pendingOrders = storeOrders.filter(o => o.status === 'new');

  const [newOrderToast, setNewOrderToast] = useState<{ id: string; recipientName: string; total: number } | null>(null);

  // Instant notification listener for new incoming orders
  React.useEffect(() => {
    const handleNewOrder = (e: any) => {
      const ord = e?.detail?.order;
      const targetMerchantId = e?.detail?.merchantId;
      if (ord && (!targetMerchantId || targetMerchantId === store?.id)) {
        setNewOrderToast({
          id: ord.id,
          recipientName: ord.recipientName,
          total: ord.finalTotal,
        });
      }
    };
    window.addEventListener('new_order_placed', handleNewOrder);
    return () => {
      window.removeEventListener('new_order_placed', handleNewOrder);
    };
  }, [store?.id]);

  // Financial Metrics
  const deliveredOrders = storeOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = storeOrders.filter(o => o.status === 'cancelled');

  const totalGrossSales = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const platformCommissionsDeducted = deliveredOrders.reduce((sum, o) => sum + o.commissionAmount, 0);
  const netEarnings = totalGrossSales - platformCommissionsDeducted;

  // Store reviews
  const storeProductIds = new Set(storeProducts.map(p => p.id));
  const storeReviews = reviews.filter(r => storeProductIds.has(r.productId));

  const openAddModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdOriginalPrice('');
    setProdCategoryId(categories[1]?.id || 'cat_food');
    setProdImages(['/src/assets/images/product_iraqi_dates_1791352458875.jpg']);
    setProdPrimaryIndex(0);
    setProdInStock(true);
    setProdTags([]);
    setAiAnalysisSuccessMsg('');
    setAiToast(null);
    setFormError('');
    setMarketingAdCopy('');
    setIsMarketingAdCopied(false);
    setShowMarketingAdSection(false);
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description);
    setProdPrice(p.price.toString());
    setProdOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setProdCategoryId(p.categoryId);
    const imgs = p.images && p.images.length > 0 ? [...p.images] : [p.imageUrl];
    setProdImages(imgs);
    const primIdx = imgs.indexOf(p.imageUrl);
    setProdPrimaryIndex(primIdx >= 0 ? primIdx : 0);
    setProdInStock(p.inStock);
    setProdTags(p.tags || []);
    setAiAnalysisSuccessMsg('');
    setAiToast(null);
    setFormError('');
    setMarketingAdCopy('');
    setIsMarketingAdCopied(false);
    setShowMarketingAdSection(false);
    setIsProductModalOpen(true);
  };

  // Dedicated "Manage Images" for a product anytime after publication
  const openManageImagesModal = (p: Product) => {
    setManagingImagesProduct(p);
    const imgs = p.images && p.images.length > 0 ? [...p.images] : [p.imageUrl];
    setManageImagesList(imgs);
    const primIdx = imgs.indexOf(p.imageUrl);
    setManageImagesPrimaryIndex(primIdx >= 0 ? primIdx : 0);
    setManageImagesSuccessMsg('');
  };

  const handleSaveManagingImages = () => {
    if (!managingImagesProduct) return;
    const prim = manageImagesList[manageImagesPrimaryIndex] || manageImagesList[0] || managingImagesProduct.imageUrl;
    updateProductImages(managingImagesProduct.id, manageImagesList, prim);
    setManageImagesSuccessMsg('تم حفظ صور المنتج بنجاح وتحديثها في المتجر.');
    setTimeout(() => {
      setManageImagesSuccessMsg('');
      setManagingImagesProduct(null);
    }, 1200);
  };

  const handleAddProductImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('حجم الصورة كبير جداً. الحد الأقصى 5 ميغابايت.');
      return;
    }

    compressImageFile(file, 640, 0.75)
      .then(compressedDataUrl => {
        setProdImages(prev => {
          if (prev.length === 1 && prev[0].includes('product_iraqi_dates')) {
            return [compressedDataUrl];
          }
          return [compressedDataUrl, ...prev];
        });
        setProdPrimaryIndex(0);
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const dataUrl = reader.result as string;
            setProdImages(prev => {
              if (prev.length === 1 && prev[0].includes('product_iraqi_dates')) {
                return [dataUrl];
              }
              return [dataUrl, ...prev];
            });
            setProdPrimaryIndex(0);
          }
        };
        reader.readAsDataURL(file);
      });
  };

  const handleAddQuickImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    compressImageFile(file, 640, 0.75)
      .then(compressedDataUrl => {
        setManageImagesList(prev => [...prev, compressedDataUrl]);
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setManageImagesList(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
  };

  // Current store images
  const currentStoreImages: string[] =
    store.images && store.images.length > 0
      ? store.images
      : store.coverUrl
      ? [store.coverUrl]
      : [];

  const handleSetPrimaryStoreImage = (targetUrl: string) => {
    updateStoreImages(store.id, currentStoreImages, targetUrl);
    setStoreImagesSuccessMsg('تم تعيين الصورة كغلاف رئيسي للمتجر بنجاح.');
    setTimeout(() => setStoreImagesSuccessMsg(''), 3000);
  };

  const handleDeleteStoreImage = (indexToDelete: number) => {
    const targetToDelete = currentStoreImages[indexToDelete];
    const updated = currentStoreImages.filter((_, idx) => idx !== indexToDelete);
    const newCover = updated.length > 0
      ? (store.coverUrl === targetToDelete ? updated[0] : (store.coverUrl || updated[0]))
      : '';
    updateStoreImages(store.id, updated, newCover);
    setStoreImagesSuccessMsg('تم حذف الصورة من المتجر بنجاح.');
    setTimeout(() => setStoreImagesSuccessMsg(''), 3000);
  };

  const handleClearStoreCoverImage = () => {
    const updated = currentStoreImages.filter(img => img !== store.coverUrl);
    updateStoreImages(store.id, updated, '');
    setStoreImagesSuccessMsg('تم حذف وإلغاء صورة الغلاف الرئيسية للمتجر بنجاح.');
    setTimeout(() => setStoreImagesSuccessMsg(''), 3000);
  };

  const handleReorderStoreImage = (fromIndex: number, direction: 'prev' | 'next') => {
    const toIndex = direction === 'prev' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= currentStoreImages.length) return;
    const reordered = [...currentStoreImages];
    const item = reordered[fromIndex];
    reordered[fromIndex] = reordered[toIndex];
    reordered[toIndex] = item;
    updateStoreImages(store.id, reordered, store.coverUrl);
    setStoreImagesSuccessMsg('تم تحديث ترتيب صور المتجر بنجاح.');
    setTimeout(() => setStoreImagesSuccessMsg(''), 2500);
  };

  const handleAddStoreImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStoreImageError('يرجى اختيار ملف صورة صالح.');
      return;
    }
    compressImageFile(file, 960, 0.75)
      .then(compressed => {
        const updated = [...currentStoreImages, compressed];
        updateStoreImages(store.id, updated, store.coverUrl || compressed);
        setStoreImagesSuccessMsg('تمت إضافة صورة جديدة لمتجرك بنجاح.');
        setTimeout(() => setStoreImagesSuccessMsg(''), 3000);
        setIsAddStoreImageModalOpen(false);
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const updated = [...currentStoreImages, reader.result];
            updateStoreImages(store.id, updated, store.coverUrl || reader.result);
            setStoreImagesSuccessMsg('تمت إضافة صورة جديدة لمتجرك بنجاح.');
            setTimeout(() => setStoreImagesSuccessMsg(''), 3000);
            setIsAddStoreImageModalOpen(false);
          }
        };
        reader.readAsDataURL(file);
      });
  };

  // AI Feature: Generate Product Name, Category, Description & Tags from image OR base product name
  const handleAnalyzeProductImage = async () => {
    if (prodImages.length === 0 && (!prodName || !prodName.trim())) {
      setAiToast({
        type: 'error',
        message: 'يرجى رفع صورة المنتج أو كتابة اسمه الأساسي لتحليلها وتوليد البيانات بالذكاء الاصطناعي 📸✨',
      });
      return;
    }

    setIsAnalyzingImage(true);
    setAiToast({
      type: 'info',
      message: 'جارٍ التحليل بالذكاء الاصطناعي وتوليد الاسم والوصف والقسم والوسوم...',
    });
    setFormError('');

    try {
      let base64Data: string | null = null;
      if (prodImages.length > 0) {
        const selectedImg = prodImages[prodPrimaryIndex] || prodImages[0];
        base64Data = selectedImg;

        // If it's a relative URL path or web URL, fetch and convert to base64
        if (!selectedImg.startsWith('data:image')) {
          try {
            const response = await fetch(selectedImg);
            const blob = await response.blob();
            base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (fetchErr) {
            console.warn('Could not convert image to base64 blob:', fetchErr);
          }
        }
      }

      const availableCats = categories.map(c => ({ id: c.id, name: c.name }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch('/api/ai/generate-product-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          productName: prodName.trim(),
          mimeType: 'image/jpeg',
          availableCategories: availableCats,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل توليد بيانات المنتج بالذكاء الاصطناعي');
      }

      // Immediately apply to form fields and update state
      if (data.suggestedName || data.name || data.title) {
        setProdName(data.suggestedName || data.name || data.title);
      }
      if (data.categoryId && categories.some(c => c.id === data.categoryId)) {
        setProdCategoryId(data.categoryId);
      } else if (categories[0]?.id) {
        setProdCategoryId(categories[0].id);
      }
      if (data.description) {
        setProdDesc(data.description);
      }
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        setProdTags(data.tags);
      }

      setAiToast({
        type: 'success',
        message: 'تم بنجاح! تم توليد الاسم والوصف وتحديد القسم والوسوم بالذكاء الاصطناعي ✨',
      });
      setTimeout(() => setAiToast(null), 5000);
    } catch (err: any) {
      console.error('Gemini product analysis error:', err);
      const isTimeout = err?.name === 'AbortError' || String(err?.message).includes('timeout');
      const errorMsg = isTimeout
        ? 'انتهت مهلة استدعاء الذكاء الاصطناعي، يرجى المحاولة مرة أخرى أو التأكد من الاتصال.'
        : (err?.message || 'حدث خطأ أثناء توليد بيانات المنتج بالذكاء الاصطناعي، يرجى المحاولة مرة أخرى.');

      setAiToast({
        type: 'error',
        message: errorMsg,
      });
      setTimeout(() => setAiToast(null), 6000);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // AI Feature: Marketing & Copywriting Assistant (Instagram & TikTok)
  const handleGenerateMarketingAd = async () => {
    if (!prodName && prodImages.length === 0) {
      setAiToast({
        type: 'error',
        message: 'يرجى كتابة اسم المنتج أو رفع صورته أولاً لاقتراح نصوص ترويجية إعلانية 📢',
      });
      return;
    }

    setIsGeneratingMarketingAd(true);
    setShowMarketingAdSection(true);
    setAiToast({
      type: 'info',
      message: 'جارٍ توليد إعلان تسويقي جاهز لإنستغرام وتيك توك بالذكاء الاصطناعي...',
    });

    try {
      const selectedCat = categories.find(c => c.id === prodCategoryId);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch('/api/ai/generate-marketing-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: prodName || 'منتج تجاري فاخر',
          categoryName: selectedCat?.name || '',
          description: prodDesc,
          price: prodPrice,
          storeName: store?.storeName || 'متجرنا في دكانة',
          governorate: store?.governorate || 'كافة المحافظات',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok || !data.success || !data.adCopy) {
        throw new Error(data.error || 'فشل توليد النص الإعلاني');
      }

      setMarketingAdCopy(data.adCopy);
      setAiToast({
        type: 'success',
        message: 'تم توليد المنشور الإعلاني بنجاح! جاهز للنسخ والنشر على إنستغرام وتيك توك 🚀✨',
      });
      setTimeout(() => setAiToast(null), 5000);
    } catch (err: any) {
      console.error('Marketing copywriting error:', err);
      const isTimeout = err?.name === 'AbortError' || String(err?.message).includes('timeout');
      setAiToast({
        type: 'error',
        message: isTimeout
          ? 'انتهت مهلة استدعاء الذكاء الاصطناعي، يرجى المحاولة مرة أخرى.'
          : (err?.message || 'حدث خطأ أثناء توليد النص الإعلاني.'),
      });
      setTimeout(() => setAiToast(null), 5000);
    } finally {
      setIsGeneratingMarketingAd(false);
    }
  };

  const handleCopyMarketingAd = () => {
    if (!marketingAdCopy) return;
    navigator.clipboard.writeText(marketingAdCopy).then(() => {
      setIsMarketingAdCopied(true);
      setAiToast({
        type: 'success',
        message: 'تم نسخ المنشور الإعلاني إلى الحافظة بنجاح! 📋✨',
      });
      setTimeout(() => {
        setIsMarketingAdCopied(false);
        setAiToast(null);
      }, 3500);
    }).catch(() => {
      // Fallback
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!prodName.trim()) {
      setFormError('يرجى كتابة اسم المنتج.');
      return;
    }

    const priceNum = Number(prodPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('يرجى إدخال سعر صحيح بالدينار العراقي.');
      return;
    }

    const origPriceNum = prodOriginalPrice ? Number(prodOriginalPrice) : undefined;
    let discountPercent: number | undefined = undefined;
    if (origPriceNum && origPriceNum > priceNum) {
      discountPercent = Math.round(((origPriceNum - priceNum) / origPriceNum) * 100);
    }

    const cat = categories.find(c => c.id === prodCategoryId);
    const categoryName = cat ? cat.name : 'منتجات عامة';

    const safeImages = prodImages.length > 0 ? prodImages : ['/src/assets/images/product_iraqi_dates_1791352458875.jpg'];
    const primaryImg = safeImages[prodPrimaryIndex] || safeImages[0];

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: prodName.trim(),
        description: prodDesc.trim(),
        price: priceNum,
        originalPrice: origPriceNum,
        discountPercent,
        finalPrice: priceNum,
        categoryId: prodCategoryId,
        categoryName,
        imageUrl: primaryImg,
        images: safeImages,
        inStock: prodInStock,
        tags: prodTags,
      });
    } else {
      addProduct({
        merchantId: store.id,
        storeName: store.storeName,
        name: prodName.trim(),
        description: prodDesc.trim(),
        price: priceNum,
        originalPrice: origPriceNum,
        discountPercent,
        finalPrice: priceNum,
        categoryId: prodCategoryId,
        categoryName,
        imageUrl: primaryImg,
        images: safeImages,
        inStock: prodInStock,
        tags: prodTags,
      });
    }

    setIsProductModalOpen(false);
  };

  // -------------------------------------------------------------
  // Product Drafts Handlers (مسودات المنتجات)
  // -------------------------------------------------------------
  const handleSaveProductDraft = async () => {
    setFormError('');
    if (!prodName.trim()) {
      setFormError('يرجى إدخال اسم المنتج على الأقل لحفظ المسودة.');
      return;
    }

    const priceNum = prodPrice ? Number(prodPrice) : undefined;
    const origPriceNum = prodOriginalPrice ? Number(prodOriginalPrice) : undefined;
    const cat = categories.find(c => c.id === prodCategoryId);
    const categoryName = cat ? cat.name : 'منتجات عامة';
    const safeImages = prodImages.length > 0 ? prodImages : ['/src/assets/images/product_iraqi_dates_1791352458875.jpg'];
    const primaryImg = safeImages[prodPrimaryIndex] || safeImages[0];

    const draftId = editingDraftId || `draft_prod_${Date.now()}`;
    const newDraft: ProductDraft = {
      id: draftId,
      merchantId: store.id,
      name: prodName.trim(),
      description: prodDesc.trim(),
      price: priceNum,
      originalPrice: origPriceNum,
      categoryId: prodCategoryId,
      categoryName,
      imageUrl: primaryImg,
      images: safeImages,
      inStock: prodInStock,
      tags: prodTags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProductDrafts(prev => {
      const filtered = prev.filter(d => d.id !== draftId);
      const updated = [newDraft, ...filtered];
      try {
        localStorage.setItem(`dukkana_prod_drafts_${store.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch('/api/drafts/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDraft),
    }).catch(() => {});

    setDraftSuccessNotice('تم حفظ المنتج كمسودة بنجاح! يمكنك العودة إليها ونشرها في أي وقت بنقرة واحدة.');
    setTimeout(() => setDraftSuccessNotice(''), 4000);
    setIsProductModalOpen(false);
    setEditingDraftId(null);
  };

  const handlePublishDraftToStore = (draft: ProductDraft) => {
    const priceNum = draft.price && draft.price > 0 ? draft.price : 10000;
    const origPriceNum = draft.originalPrice;
    let discountPercent: number | undefined = undefined;
    if (origPriceNum && origPriceNum > priceNum) {
      discountPercent = Math.round(((origPriceNum - priceNum) / origPriceNum) * 100);
    }

    addProduct({
      merchantId: store.id,
      storeName: store.storeName,
      name: draft.name,
      description: draft.description || '',
      price: priceNum,
      originalPrice: origPriceNum,
      discountPercent,
      finalPrice: priceNum,
      categoryId: draft.categoryId || categories[1]?.id || 'cat_food',
      categoryName: draft.categoryName || 'منتجات عامة',
      imageUrl: draft.imageUrl || '/src/assets/images/product_iraqi_dates_1791352458875.jpg',
      images: draft.images || [draft.imageUrl || '/src/assets/images/product_iraqi_dates_1791352458875.jpg'],
      inStock: draft.inStock !== false,
      tags: draft.tags || [],
    });

    handleDeleteProductDraft(draft.id);
    setDraftSuccessNotice(`تم نشر المسودة "${draft.name}" للمتجر بنجاح! المنتج معروض الآن في قائمة منتجاتك.`);
    setTimeout(() => setDraftSuccessNotice(''), 4500);
  };

  const handleEditProductDraft = (draft: ProductDraft) => {
    setEditingDraftId(draft.id);
    setEditingProduct(null);
    setProdName(draft.name);
    setProdDesc(draft.description || '');
    setProdPrice(draft.price ? draft.price.toString() : '');
    setProdOriginalPrice(draft.originalPrice ? draft.originalPrice.toString() : '');
    setProdCategoryId(draft.categoryId || categories[1]?.id || 'cat_food');
    setProdInStock(draft.inStock !== false);
    setProdTags(draft.tags || []);
    setProdImages(draft.images || (draft.imageUrl ? [draft.imageUrl] : []));
    setProdPrimaryIndex(0);
    setFormError('');
    setIsProductModalOpen(true);
  };

  const handleDeleteProductDraft = (draftId: string) => {
    setProductDrafts(prev => {
      const updated = prev.filter(d => d.id !== draftId);
      try {
        localStorage.setItem(`dukkana_prod_drafts_${store.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    fetch(`/api/drafts/products/${draftId}`, { method: 'DELETE' }).catch(() => {});
  };

  // -------------------------------------------------------------
  // Commercial Promotion & Campaign Handlers
  // -------------------------------------------------------------
  const calculateCampaignPricing = (daysCount: number) => {
    const dailyRate = 5000;
    const days = Math.max(1, daysCount);
    const gross = days * dailyRate;

    let discountPct = 0;
    let badgeText = '';
    if (days >= 14) {
      discountPct = 25;
      badgeText = 'خصم الأسبوعين الأكثر طلباً (وفر 25%)';
    } else if (days >= 7) {
      discountPct = 15;
      badgeText = 'خصم الأسبوع (وفر 15%)';
    }

    const savings = Math.round((gross * discountPct) / 100);
    const finalTotal = gross - savings;

    return { dailyRate, days, gross, discountPct, badgeText, savings, finalTotal };
  };

  const [isStoppingCampaign, setIsStoppingCampaign] = useState(false);

  const handleStopPromotion = async (productIdOrPromoId: string, customName?: string) => {
    setIsStoppingCampaign(true);
    try {
      const targetProd = products.find(p => p.id === productIdOrPromoId);
      const targetPromo = commercialPromotions.find(c => c.id === productIdOrPromoId || c.productId === productIdOrPromoId);
      const prodId = targetPromo?.productId || targetProd?.id || productIdOrPromoId;
      const prodName = customName || targetPromo?.productName || targetProd?.name || 'المنتج';

      // 1. Immediately unpromote locally in client market context
      unpromoteProduct(prodId);

      // 2. Immediately update commercialPromotions state to stopped
      setCommercialPromotions(prev =>
        prev.map(c =>
          c.id === productIdOrPromoId || c.productId === prodId
            ? { ...c, status: 'stopped', stoppedAt: new Date().toISOString() }
            : c
        )
      );

      // 3. Call backend API endpoint
      const res = await fetch(`/api/promotions/commercial/${productIdOrPromoId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: prodId }),
      });
      const data = await res.json().catch(() => ({}));

      setCampaignNotice({
        text: data.message || `تم إيقاف ترويج "${prodName}" بنجاح وتحديث حالة الحملة إلى متوقفة وإلغاء تمييزه من صدارة المتجر.`,
        type: 'success',
      });
    } catch (err: any) {
      setCampaignNotice({
        text: 'تم إيقاف ترويج المنتج بنجاح وتحديث حالته إلى متوقف وإلغاء تمييزه من صدارة المتجر.',
        type: 'success',
      });
    } finally {
      setIsStoppingCampaign(false);
    }
  };

  const handleLaunchCommercialCampaign = async (targetProdId: string, daysCount: number) => {
    if (!targetProdId) {
      setCampaignNotice({ text: 'يرجى اختيار المنتج المراد ترويجه أولاً.', type: 'error' });
      return;
    }
    const targetProduct = products.find(p => p.id === targetProdId);
    if (!targetProduct) return;

    setIsLaunchingCampaign(true);
    setCampaignNotice(null);

    const pricing = calculateCampaignPricing(daysCount);

    try {
      const res = await fetch('/api/promotions/commercial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: store.id,
          storeName: store.storeName,
          productId: targetProduct.id,
          productName: targetProduct.name,
          productImage: targetProduct.imageUrl,
          durationDays: pricing.days,
          notes: campaignNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إرسال طلب الترويج');
      }

      // New Admin Approval Workflow: campaign is submitted as pending_approval
      if (data.promotion) {
        setCommercialPromotions(prev => [data.promotion, ...prev.filter(p => p.id !== data.promotion.id)]);
      } else {
        const pendingPromo: CommercialPromotion = {
          id: `cp_${Date.now()}`,
          merchantId: store.id,
          storeName: store.storeName,
          productId: targetProduct.id,
          productName: targetProduct.name,
          productImage: targetProduct.imageUrl,
          durationDays: pricing.days,
          dailyRate: 5000,
          subtotal: pricing.gross,
          discountPercent: pricing.discountPct,
          discountAmount: pricing.savings,
          finalTotal: pricing.finalTotal,
          status: 'pending_approval',
          startDate: null,
          endDate: null,
          createdAt: new Date().toISOString(),
        };
        setCommercialPromotions(prev => [pendingPromo, ...prev]);
      }

      setCampaignNotice({
        text: `تم إرسال طلب ترويج "${targetProduct.name}" بنجاح وحالته الآن «قيد مراجعة الإدارة» ⏳ (بانتظار موافقة المدير وتفعيله رسمياً).`,
        type: 'success',
      });
      setPromotingProduct(null);
    } catch (err: any) {
      setCampaignNotice({
        text: err.message || 'حدث خطأ أثناء إرسال طلب الترويج للإدارة.',
        type: 'error',
      });
    } finally {
      setIsLaunchingCampaign(false);
    }
  };

  const handleSaveCampaignDraft = (targetProdId: string, daysCount: number) => {
    if (!targetProdId) {
      setCampaignNotice({ text: 'يرجى اختيار المنتج لحفظ مسودة الحملة.', type: 'error' });
      return;
    }
    const targetProduct = products.find(p => p.id === targetProdId);
    if (!targetProduct) return;

    const pricing = calculateCampaignPricing(daysCount);
    const draftId = `draft_camp_${Date.now()}`;
    const newDraft: AdCampaignDraft = {
      id: draftId,
      merchantId: store.id,
      productId: targetProduct.id,
      productName: targetProduct.name,
      productImage: targetProduct.imageUrl,
      durationDays: pricing.days,
      subtotal: pricing.gross,
      discountPercent: pricing.discountPct,
      discountAmount: pricing.savings,
      finalTotal: pricing.finalTotal,
      notes: campaignNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setCampaignDrafts(prev => {
      const updated = [newDraft, ...prev];
      try {
        localStorage.setItem(`dukkana_camp_drafts_${store.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch('/api/drafts/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDraft),
    }).catch(() => {});

    setCampaignNotice({
      text: `تم حفظ إعدادات ترويج "${targetProduct.name}" كمسودة بنجاح! يمكنك تفعيلها وإطلاقها في أي وقت.`,
      type: 'success',
    });
    setPromotingProduct(null);
  };

  const handleLaunchDraftCampaign = (draft: AdCampaignDraft) => {
    handleLaunchCommercialCampaign(draft.productId, draft.durationDays);
    handleDeleteCampaignDraft(draft.id);
  };

  const handleDeleteCampaignDraft = (draftId: string) => {
    setCampaignDrafts(prev => {
      const updated = prev.filter(d => d.id !== draftId);
      try {
        localStorage.setItem(`dukkana_camp_drafts_${store.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    fetch(`/api/drafts/campaigns/${draftId}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Urgent Incoming Orders Notification Alert Banner */}
      {(newOrderToast || pendingOrders.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-purple-800 text-white p-4 sm:p-5 rounded-3xl shadow-lg shadow-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <Bell className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-950/40 text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300/30">
                  إشعار طلب جديد فوري
                </span>
                <span className="text-xs text-amber-100 font-mono">الآن</span>
              </div>
              <h4 className="font-black text-sm sm:text-base mt-0.5">
                {newOrderToast
                  ? `تم استلام طلب جديد (#${newOrderToast.id}) بقيمة ${newOrderToast.total.toLocaleString()} د.ع من ${newOrderToast.recipientName}!`
                  : `يوجد لديك ${pendingOrders.length} ${pendingOrders.length > 1 ? 'طلبات جديدة واردة' : 'طلب جديد وارد'} بانتظار التأكيد والتجهيز!`}
              </h4>
              <p className="text-xs text-amber-100/90 mt-0.5">
                بمجرد نقرك على «موافقة وتأكيد»، يُرسل النظام إشعاراً فورياً للزبون ويتم بدء تحضير الشحنة.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('store-orders-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              setNewOrderToast(null);
            }}
            className="px-5 py-2.5 bg-white text-purple-950 font-black text-xs rounded-xl shadow-md hover:bg-amber-50 transition cursor-pointer shrink-0 text-center"
          >
            الانتقال للطلبات والموافقة فوراً
          </button>
        </div>
      )}

      {/* Merchant Header & Status Banner */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {store.coverUrl ? (
            <div className="relative group shrink-0">
              <img
                src={store.coverUrl}
                alt={store.storeName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-purple-200 shadow-xs"
                onError={e => {
                  (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                }}
              />
              <button
                type="button"
                onClick={handleClearStoreCoverImage}
                className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-sm cursor-pointer transition"
                title="حذف صورة غلاف المتجر"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Store className="w-8 h-8" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900">
                {store?.storeName || 'متجر البائع والمورّد'}
              </h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  store?.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {store?.status === 'approved' ? 'بائع ومورّد معتمد' : 'قيد مراجعة الإدارة'}
              </span>
              {store.coverUrl && (
                <button
                  type="button"
                  onClick={handleClearStoreCoverImage}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف الغلاف الرئيسي</span>
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-xl">
              {store?.description || 'إدارة منتجات ومبيعات متجرك في سوق دكانة العراقي (للبائعين والمورّدين)'}
            </p>
            <div className="text-[11px] text-zinc-400 mt-1">
              المحافظة: {store?.governorate} · هاتف المتجر: {store?.phone} · نسبة عمولة المنصة: {store?.commissionRate}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          {onOpenChat && (
            <button
              onClick={() => onOpenChat('usr_admin', 'admin', 'إدارة منصة دكانة')}
              className="px-3 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="تواصل مباشر مع إدارة دكانة"
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
              <span>محادثة الإدارة</span>
            </button>
          )}

          <button
            onClick={() => setMerchantTab('products')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              merchantTab === 'products'
                ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-700/20'
                : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
            }`}
            title="منتجات المتجر والطلبات"
          >
            <Package className="w-3.5 h-3.5" />
            <span>المنتجات ({storeProducts.length})</span>
          </button>

          <button
            onClick={() => setMerchantTab('promotions')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              merchantTab === 'promotions'
                ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-700/20'
                : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
            }`}
            title="نظام الحملات والترويج واحتساب الخصومات التلقائية"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>الحملات والترويج</span>
          </button>

          <button
            onClick={() => setMerchantTab('product_drafts')}
            className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              merchantTab === 'product_drafts'
                ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-700/20'
                : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
            }`}
            title="مسودات المنتجات المحفوظة"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>مسودات المنتجات ({productDrafts.length})</span>
          </button>

          <button
            onClick={() => setMerchantTab('campaign_drafts')}
            className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              merchantTab === 'campaign_drafts'
                ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-700/20'
                : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
            }`}
            title="مسودات الحملات الإعلانية"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>مسودات الحملات ({campaignDrafts.length})</span>
          </button>

          <button
            onClick={() => {
              setStoreNameInput(store.storeName);
              setStoreDescInput(store.description);
              setStoreGovInput(store.governorate);
              setStorePhoneInput(store.phone);
              setIsStoreModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>بيانات المتجر</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-700/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Delivered Orders */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold text-zinc-600">الطلبات المكتملة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-zinc-900 tabular-nums">
            {deliveredOrders.length}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            تم تسليمها للمشتري بنجاح
          </span>
        </div>

        {/* Metric 2: Gross Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold text-zinc-600">إجمالي المبيعات</span>
            <ShoppingBag className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-950 tabular-nums">
            {formatIQDTabular(totalGrossSales)}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            قيمة المنتجات المسلمة
          </span>
        </div>

        {/* Metric 3: Platform Commission (5%) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold text-zinc-600">عمولة دكانة ({store?.commissionRate}%)</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 tabular-nums">
            {formatIQDTabular(platformCommissionsDeducted)}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            تُستقطع فقط عند تم التوصيل
          </span>
        </div>

        {/* Metric 4: Net Earnings */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-purple-50/50">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold text-purple-900">صافي الأرباح</span>
            <TrendingUp className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums">
            {formatIQDTabular(netEarnings)}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            مستحقات التاجر الصافية
          </span>
        </div>
      </div>

      {/* Tab Switcher Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 overflow-x-auto text-xs font-bold no-scrollbar">
        <button
          onClick={() => setMerchantTab('products')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            merchantTab === 'products'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>المنتجات والطلبات ({storeProducts.length})</span>
        </button>

        <button
          onClick={() => setMerchantTab('promotions')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            merchantTab === 'promotions'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>الحملات والترويج</span>
        </button>

        <button
          onClick={() => setMerchantTab('product_drafts')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            merchantTab === 'product_drafts'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>مسودات المنتجات ({productDrafts.length})</span>
        </button>

        <button
          onClick={() => setMerchantTab('campaign_drafts')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            merchantTab === 'campaign_drafts'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>مسودات الحملات ({campaignDrafts.length})</span>
        </button>
      </div>

      {/* Global Action Notices */}
      {campaignNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition animate-in fade-in ${
            campaignNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {campaignNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{campaignNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setCampaignNotice(null)}
            className="text-zinc-400 hover:text-zinc-700 font-bold px-2 py-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {draftSuccessNotice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between transition animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{draftSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftSuccessNotice('')}
            className="text-emerald-600 hover:text-emerald-900 font-bold px-2 py-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {merchantTab === 'products' && (
        <>
          {/* Store Products Management */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-700" />
            <h2 className="text-base font-black text-zinc-900">
              منتجات المتجر ({storeProducts.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            تخضع المنتجات الجديدة لمراجعة المدير لضمان السلامة والامتثال.
          </span>
        </div>

        {promotionSuccessMsg && (
          <div className="mx-5 my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{promotionSuccessMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">المنتج</th>
                <th className="p-3.5">الصور</th>
                <th className="p-3.5">القسم</th>
                <th className="p-3.5">السعر</th>
                <th className="p-3.5">الخصم</th>
                <th className="p-3.5">التوفر</th>
                <th className="p-3.5">حالة الموافقة</th>
                <th className="p-3.5">الترويج</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60">
              {storeProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-400">
                    لم تقم بإضافة أي منتجات بعد. اضغط على زر "إضافة منتج جديد" للبدء.
                  </td>
                </tr>
              ) : (
                storeProducts.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50/50">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-zinc-100 shrink-0"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/src/assets/images/product_iraqi_dates_1791352458875.jpg';
                          }}
                        />
                        <span className="font-bold text-zinc-900 line-clamp-1">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => openManageImagesModal(p)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold cursor-pointer transition"
                        title="تعديل أو إضافة صور للمنتج في أي وقت"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{(p.images?.length || 1)} صور</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-zinc-600">{p.categoryName}</td>
                    <td className="p-3.5 font-black text-purple-950 tabular-nums">
                      {formatIQDTabular(p.finalPrice)}
                    </td>
                    <td className="p-3.5">
                      {p.discountPercent ? (
                        <span className="font-bold text-rose-600">{p.discountPercent}%</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          p.inStock
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {p.inStock ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                          p.approvalStatus === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : p.approvalStatus === 'rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {p.approvalStatus === 'approved'
                          ? 'مقبول (معروض)'
                          : p.approvalStatus === 'rejected'
                          ? 'مرفوض'
                          : 'قيد المراجعة'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {p.isPromoted ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-900 border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                            <span>مروّج ⭐</span>
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm('هل تريد إيقاف ترويج هذا المنتج؟')) {
                                handleStopPromotion(p.id, p.name);
                              }
                            }}
                            className="text-[10px] text-zinc-400 hover:text-rose-600 underline cursor-pointer"
                            title="إيقاف الترويج"
                          >
                            إيقاف
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPromotingProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                          title="ترويج المنتج في صدارة المتجر"
                        >
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>ترويج</span>
                        </button>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 text-zinc-600 hover:text-purple-700 cursor-pointer"
                          title="تعديل المنتج"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer"
                          title="حذف المنتج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dedicated Section: Store Images & Gallery (صور المتجر) */}
      <div id="store-images-section" className="bg-white rounded-3xl border border-zinc-200/90 overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-700" />
              <h2 className="text-base font-black text-zinc-900">
                صور المتجر ({currentStoreImages.length})
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-xl leading-relaxed">
              يمكنك إضافة عدد الصور الذي تريده لمتجرك لتعريف الزبائن بنشاطك التجاري. يمكنك ترتيب الصور، استبدالها، حذفها، وتحديد صورة الغلاف الرئيسية للمتجر في أي وقت.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setIsPreviewStoreOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="معاينة المتجر كما يراه الزبائن"
            >
              <Eye className="w-4 h-4 text-purple-700" />
              <span>معاينة للزبائن</span>
            </button>
            <button
              onClick={() => {
                setStoreImageError('');
                setNewStoreImageUrl('');
                setIsAddStoreImageModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صورة للمتجر</span>
            </button>
          </div>
        </div>

        {storeImagesSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{storeImagesSuccessMsg}</span>
          </div>
        )}

        {/* Store Images Grid with Interactive Controls */}
        {currentStoreImages.length === 0 ? (
          <div className="py-12 px-6 border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/70 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <ImageIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-800">لا توجد صور مخصصة لمتجرك حالياً</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                أضف صورة أو غلاف لمتجرك لتظهر للزبائن في صدارة المتجر وقائمة المتاجر المعتمدة في السوق.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStoreImageError('');
                setNewStoreImageUrl('');
                setIsAddStoreImageModalOpen(true);
              }}
              className="mt-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صورة رئيسية للمتجر الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {currentStoreImages.map((imgUrl, idx) => {
              const isCover = store.coverUrl === imgUrl || (idx === 0 && !store.coverUrl);
              return (
                <div
                  key={idx}
                  className={`relative rounded-2xl overflow-hidden border bg-zinc-50 flex flex-col justify-between group transition ${
                    isCover ? 'border-purple-600 ring-2 ring-purple-600/20' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {/* Image slot */}
                  <div className="relative aspect-4/3 bg-zinc-200 overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={`${store.storeName} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                      }}
                    />
                    {isCover && (
                      <div className="absolute top-2 right-2 bg-purple-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        <span>الغلاف الرئيسي</span>
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Card Controls */}
                  <div className="p-3 bg-white space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      {/* Reorder Buttons */}
                      <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50">
                        <button
                          type="button"
                          onClick={() => handleReorderStoreImage(idx, 'prev')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-zinc-200 text-zinc-600 disabled:opacity-20 cursor-pointer"
                          title="تحريك للأمام"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] px-1 font-bold text-zinc-500">{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleReorderStoreImage(idx, 'next')}
                          disabled={idx === currentStoreImages.length - 1}
                          className="p-1 hover:bg-zinc-200 text-zinc-600 disabled:opacity-20 cursor-pointer"
                          title="تحريك للخلف"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteStoreImage(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition flex items-center gap-1"
                        title="حذف هذه الصورة نهائياً من المتجر"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[11px] font-bold text-rose-600">حذف</span>
                      </button>
                    </div>

                    {/* Make Primary Cover Button / Status */}
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryStoreImage(imgUrl)}
                        className="w-full py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                      >
                        <Star className="w-3 h-3 text-purple-600" />
                        <span>تعيين كغلاف رئيسي</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="py-1 text-center text-[11px] font-bold text-purple-800 bg-purple-50/50 rounded-lg border border-purple-100 flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 fill-purple-600 text-purple-600" />
                          <span>الصورة المعتمدة للغلاف</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteStoreImage(idx)}
                          className="w-full py-1 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                          title="حذف الصورة الرئيسية للمتجر"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف الصورة الرئيسية</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Store Orders Management */}
      <div id="store-orders-section" className="bg-white rounded-3xl border border-zinc-200/90 overflow-hidden shadow-xs scroll-mt-6">
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-700" />
            <h2 className="text-base font-black text-zinc-900">
              طلبات المتجر ({storeOrders.length})
            </h2>
            {pendingOrders.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                {pendingOrders.length} جديدة بانتظار التأكيد
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500">
            أنت مسؤول كتاجر عن تجهيز وتوصيل طلبات متجرك وتحصيل المبالغ نقداً عند الاستلام.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رقم الطلب</th>
                <th className="p-3.5">المستلم والمحافظة</th>
                <th className="p-3.5">محتويات الطلب</th>
                <th className="p-3.5">المبلغ المطلوب</th>
                <th className="p-3.5">عمولة المنصة</th>
                <th className="p-3.5">حالة الطلب</th>
                <th className="p-3.5 text-center">إجراء وتحديث الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60">
              {storeOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    لا توجد طلبات واردة لمتجرك حتى الآن.
                  </td>
                </tr>
              ) : (
                storeOrders.map(ord => (
                  <tr
                    key={ord.id}
                    className={`transition ${
                      ord.status === 'new'
                        ? 'bg-amber-50/70 hover:bg-amber-100/60'
                        : 'hover:bg-zinc-50/50'
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-purple-950">{ord.id}</td>
                    <td className="p-3.5 text-zinc-700">
                      <div className="font-bold">{ord.recipientName}</div>
                      <div className="text-[11px] text-zinc-400">{ord.governorate} · {ord.recipientPhone}</div>
                    </td>
                    <td className="p-3.5 text-zinc-600">
                      {ord.items.map(i => `${i.productName} (${i.quantity})`).join(' ، ')}
                    </td>
                    <td className="p-3.5 font-black text-purple-950 tabular-nums">
                      {formatIQDTabular(ord.finalTotal)}
                    </td>
                    <td className="p-3.5 font-bold text-emerald-800 tabular-nums">
                      {ord.status === 'delivered' ? formatIQDTabular(ord.commissionAmount) : '—'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : ord.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : ord.status === 'new'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {ord.status === 'delivered'
                          ? 'تم التوصيل'
                          : ord.status === 'cancelled'
                          ? 'ملغي'
                          : ord.status === 'out_for_delivery'
                          ? 'خرج للتوصيل'
                          : ord.status === 'preparing'
                          ? 'قيد التجهيز'
                          : ord.status === 'confirmed'
                          ? 'تم التأكيد'
                          : 'طلب جديد'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {ord.status === 'new' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'confirmed')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                            title="موافقة وتأكيد الطلب وإشعار الزبون فوراً"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>موافقة وتأكيد</span>
                          </button>
                        )}
                        <select
                          value={ord.status}
                          onChange={e => updateOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className="px-2 py-1 rounded-lg border border-purple-200 bg-white text-[11px] font-bold cursor-pointer"
                        >
                          <option value="new">طلب جديد</option>
                          <option value="confirmed">تم تأكيد الطلب</option>
                          <option value="preparing">قيد التجهيز</option>
                          <option value="out_for_delivery">خرج للتوصيل</option>
                          <option value="delivered">تم التوصيل</option>
                          <option value="cancelled">إلغاء الطلب</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Store Reviews View */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-base font-black text-zinc-900">
              تقييمات الزبائن لمنتجات المتجر ({storeReviews.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            وفق سياسة النزاهة: لا يستطيع التاجر حذف أو تعديل تقييمات المشترين.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {storeReviews.length === 0 ? (
            <div className="col-span-2 text-center py-6 text-zinc-400 text-xs">
              لا توجد تقييمات مسجلة لمنتجات هذا المتجر حتى الآن.
            </div>
          ) : (
            storeReviews.map(r => (
              <div key={r.id} className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">{r.productName}</span>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map(st => (
                      <Star
                        key={st}
                        className={`w-3 h-3 ${st <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-zinc-600 text-[11px] leading-relaxed">{r.comment || 'بدون تعليق'}</p>
                <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-200/60 flex justify-between">
                  <span>بواسطة: {r.userName}</span>
                  <span>{new Date(r.createdAt).toLocaleDateString('ar-IQ')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </>
    )}

    {/* TAB 2: PROMOTIONS & CAMPAIGNS (الحملات والترويج واحتساب الخصومات التلقائية) */}
    {merchantTab === 'promotions' && (() => {
      const selectedProd = products.find(p => p.id === (campaignProductId || storeProducts[0]?.id)) || storeProducts[0];
      const activePricing = calculateCampaignPricing(campaignDurationDays);
      const activePromotedProducts = storeProducts.filter(p => p.isPromoted);

      return (
        <div className="space-y-8 animate-in fade-in">
          {/* Header Banner */}
          <div className="bg-linear-to-r from-purple-950 via-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-3 relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
              <Megaphone className="w-4 h-4 text-amber-300" />
              <span>نظام الحملات والترويج التجاري المتقدم</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              روّج لمنتجاتك وتصدّر نتائج البحث والصفحة الرئيسية 🚀
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 max-w-2xl leading-relaxed">
              سعر الترويج اليومي الأساسي: <strong className="text-white">5,000 د.ع / اليوم</strong>. احصل على خصم تلقائي <strong className="text-emerald-300">15%</strong> عند اختيار أسبوع كامل (7 إلى 13 يوماً)، أو خصم <strong className="text-emerald-300">25%</strong> عند اختيار أسبوعين فأكثر (14 يوماً فما فوق).
            </p>
          </div>

          {/* Campaign Creation Card + Invoice Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-zinc-200 p-6 space-y-6 shadow-xs">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <h3 className="font-black text-base text-zinc-900">إنشاء حملة ترويجية جديدة</h3>
              </div>

              {/* Step 1: Select Product */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-800">
                  1. اختر المنتج المراد ترويجه *
                </label>
                {storeProducts.length === 0 ? (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs text-zinc-500 text-center">
                    لم تقم بإضافة منتجات بعد. قم بإضافة منتج أولاً للتمكن من ترويجه.
                  </div>
                ) : (
                  <select
                    value={campaignProductId || selectedProd?.id || ''}
                    onChange={e => setCampaignProductId(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-purple-600/30"
                  >
                    {storeProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatIQDTabular(p.finalPrice)} ({p.categoryName})
                      </option>
                    ))}
                  </select>
                )}

                {selectedProd && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-2xl flex items-center gap-3">
                    <img
                      src={selectedProd.imageUrl}
                      alt={selectedProd.name}
                      className="w-12 h-12 rounded-xl object-cover bg-white shrink-0 border border-purple-200"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/src/assets/images/product_iraqi_dates_1791352458875.jpg';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-zinc-900 block truncate">{selectedProd.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-zinc-500">{selectedProd.categoryName}</span>
                        <span className="text-xs font-black text-purple-900">{formatIQDTabular(selectedProd.finalPrice)}</span>
                        {selectedProd.isPromoted && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                            مروّج حالياً ⭐
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Duration Days Counter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-zinc-800">2. مدة الترويج بالأيام *</label>
                  <span className="font-bold text-purple-700 font-mono">السعر: 5,000 د.ع / اليوم</span>
                </div>

                {/* Stepper & Number Input */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCampaignDurationDays(prev => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-black text-xl flex items-center justify-center transition cursor-pointer"
                    title="تقليل يوم"
                  >
                    -
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={campaignDurationDays}
                      onChange={e => setCampaignDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full py-3 px-4 text-center font-black text-base bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-purple-600/30"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                      أيام
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCampaignDurationDays(prev => prev + 1)}
                    className="w-12 h-12 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-black text-xl flex items-center justify-center transition cursor-pointer"
                    title="زيادة يوم"
                  >
                    +
                  </button>
                </div>

                {/* Quick Select Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { days: 3, label: '3 أيام', badge: 'عادي' },
                    { days: 7, label: 'أسبوع (7 أيام)', badge: 'وفر 15%' },
                    { days: 14, label: 'أسبوعين (14 يوماً)', badge: 'وفر 25%' },
                    { days: 30, label: 'شهر كامل (30 يوماً)', badge: 'وفر 25%' },
                  ].map(btn => (
                    <button
                      key={btn.days}
                      type="button"
                      onClick={() => setCampaignDurationDays(btn.days)}
                      className={`p-2.5 rounded-xl border font-bold text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                        campaignDurationDays === btn.days
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs">{btn.label}</span>
                      <span className={`text-[10px] ${campaignDurationDays === btn.days ? 'text-amber-200' : 'text-emerald-700 font-black'}`}>
                        {btn.badge}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Automatic Discount Explanation Banner */}
                {activePricing.discountPct > 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{activePricing.badgeText}</span>
                    </span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[11px] font-black">
                      خصم {activePricing.discountPct}%
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded-2xl text-[11px]">
                    💡 تلميح: عند اختيار 7 إلى 13 يوماً يتم تطبيق خصم 15% تلقائياً، ومن 14 يوماً فما فوق يُطبق خصم 25%.
                  </div>
                )}
              </div>

              {/* Step 3: Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800">
                  3. ملاحظات الحملة الإعلانية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={campaignNotes}
                  onChange={e => setCampaignNotes(e.target.value)}
                  placeholder="أي تعليمات أو تفاصيل ترغب بحفظها..."
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600/30"
                />
              </div>
            </div>

            {/* Invoice Breakdown & Actions (Right Column) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Instant Invoice Breakdown Card */}
              <div className="bg-linear-to-b from-purple-50 via-white to-purple-50/50 rounded-3xl border-2 border-purple-300 p-6 space-y-4 text-xs shadow-sm">
                <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-700" />
                    <h4 className="font-black text-sm text-zinc-900">فاتورة الترويج التلقائية اللحظية</h4>
                  </div>
                  <span className="text-[10px] bg-purple-700 text-white px-2 py-0.5 rounded-full font-bold">
                    حساب فوري
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>مدة الترويج:</span>
                    <span className="font-bold text-zinc-900">{activePricing.days} أيام × 5,000 د.ع</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-600">
                    <span>المبلغ قبل الخصم:</span>
                    <span className="font-bold text-zinc-900 tabular-nums">
                      {formatIQDTabular(activePricing.gross)}
                    </span>
                  </div>

                  {activePricing.discountPct > 0 ? (
                    <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>قيمة الخصم المقتطع ({activePricing.discountPct}%):</span>
                      </span>
                      <span className="tabular-nums font-black">
                        -{formatIQDTabular(activePricing.savings)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>الخصم المقتطع:</span>
                      <span>0 د.ع (بدون خصم)</span>
                    </div>
                  )}

                  <div className="border-t border-purple-200 pt-3 flex items-center justify-between">
                    <div>
                      <span className="font-black text-sm text-purple-950 block">المبلغ النهائي الإجمالي المستحق:</span>
                      <span className="text-[10px] text-purple-700 font-medium">بالدينار العراقي (IQD)</span>
                    </div>
                    <span className="text-xl font-black text-purple-950 tabular-nums">
                      {formatIQDTabular(activePricing.finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-purple-100">
                  <button
                    type="button"
                    disabled={isLaunchingCampaign || !selectedProd}
                    onClick={() => handleLaunchCommercialCampaign(selectedProd?.id || '', campaignDurationDays)}
                    className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-purple-700/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>
                      {isLaunchingCampaign ? 'جاري إرسال طلب الترويج...' : `تأكيد وإرسال طلب الترويج للإدارة (${formatIQDTabular(activePricing.finalTotal)})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedProd}
                    onClick={() => handleSaveCampaignDraft(selectedProd?.id || '', campaignDurationDays)}
                    className="w-full py-3 bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <Bookmark className="w-4 h-4 text-purple-700" />
                    <span>حفظ كمسودة حملة (للإطلاق لاحقاً)</span>
                  </button>
                </div>
              </div>

              {/* Benefits Checklist */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-3 text-xs">
                <h5 className="font-bold text-zinc-800">مزايا ترويج المنتج في دكانة:</h5>
                <ul className="space-y-2 text-zinc-600 text-[11px]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>ظهور فوري في صدارة الصفحة الرئيسية تحت قسم «عروض مميزة / برعاية دكانة».</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>أولوية مطلقة في ترتيب نتائج البحث والتصنيفات أمام آلاف الزبائن في الـ 19 محافظة.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>تمييز بطاقة المنتج بشارة بنفسجية أنيقة كُتب عليها <strong>«مُميّز»</strong> تجذب الشراء الفوري.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* All Merchant Campaigns Section (قيد مراجعة الإدارة / نشطة / مرفوضة / متوقفة) */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-base text-zinc-900">
                  سجل الحملات والترويج الإعلاني الخاص بك ({commercialPromotions.length > 0 ? commercialPromotions.length : activePromotedProducts.length})
                </h3>
              </div>
              <span className="text-xs text-zinc-500 font-medium">متابعة حالة الطلبات (قيد المراجعة / نشطة / مرفوضة / متوقفة)</span>
            </div>

            {(() => {
              // Combine commercialPromotions from backend with activePromotedProducts
              const campaignMap = new Map<string, any>();
              commercialPromotions.forEach(c => {
                campaignMap.set(c.id, {
                  id: c.id,
                  productId: c.productId,
                  productName: c.productName,
                  productImage: c.productImage,
                  durationDays: c.durationDays,
                  finalTotal: c.finalTotal,
                  status: c.status || 'pending_approval',
                  rejectionReason: c.rejectionReason,
                  createdAt: c.createdAt,
                });
              });

              // Also capture any product with isPromoted that doesn't have an active campaign record
              activePromotedProducts.forEach(p => {
                const found = Array.from(campaignMap.values()).find(c => c.productId === p.id && c.status === 'active');
                if (!found) {
                  campaignMap.set(`prod_${p.id}`, {
                    id: `prod_${p.id}`,
                    productId: p.id,
                    productName: p.name,
                    productImage: p.imageUrl,
                    durationDays: 7,
                    finalTotal: 5000 * 7 * 0.85,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                  });
                }
              });

              const allCampaigns = Array.from(campaignMap.values()).sort(
                (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
              );

              if (allCampaigns.length === 0) {
                return (
                  <div className="py-12 text-center text-zinc-400 text-xs space-y-2">
                    <Megaphone className="w-8 h-8 mx-auto text-zinc-300" />
                    <p className="font-bold text-zinc-600 text-sm">لا توجد حملات ترويج حالياً</p>
                    <p>اختر أحد منتجاتك بالأعلى وحدد المدة لإرسال طلب ترويج لإدارة دكانة ومضاعفة مبيعاتك!</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCampaigns.map(c => {
                    const prod = products.find(p => p.id === c.productId);
                    const imgSrc = c.productImage || prod?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300';
                    const prodName = c.productName || prod?.name || 'منتج مروّج';
                    const status = c.status;

                    return (
                      <div
                        key={c.id}
                        className={`p-4 rounded-2xl border space-y-3 relative overflow-hidden transition ${
                          status === 'active'
                            ? 'bg-purple-50/40 border-purple-200'
                            : status === 'pending_approval'
                            ? 'bg-amber-50/40 border-amber-200'
                            : status === 'rejected'
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        {/* Top: Product Info */}
                        <div className="flex items-center gap-3">
                          <img
                            src={imgSrc}
                            alt={prodName}
                            className="w-14 h-14 rounded-xl object-cover bg-white shrink-0 border border-zinc-200 shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-xs text-zinc-900 block truncate" title={prodName}>
                              {prodName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-zinc-500 font-bold bg-white px-2 py-0.5 rounded border border-zinc-200">
                                {c.durationDays || 7} أيام
                              </span>
                              <span className="text-xs font-black text-purple-950">
                                {formatIQDTabular(c.finalTotal || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Indicator */}
                        <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 font-medium">حالة الحملة:</span>
                          {status === 'pending_approval' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              <span>قيد مراجعة الإدارة ⏳</span>
                            </span>
                          )}
                          {status === 'active' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
                              <span>نشطة ومميزة 🚀</span>
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>مرفوضة من الإدارة ❌</span>
                            </span>
                          )}
                          {status === 'stopped' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-zinc-700 bg-zinc-200 border border-zinc-300 px-2.5 py-1 rounded-lg">
                              <PauseCircle className="w-3.5 h-3.5 text-zinc-500" />
                              <span>متوقفة ⏸️</span>
                            </span>
                          )}
                        </div>

                        {/* Informational Message according to status */}
                        {status === 'pending_approval' && (
                          <div className="text-[11px] text-amber-800 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                            الطلب بانتظار موافقة الإدارة. سيبدأ احتساب الأيام وتثبيت المنتج في صدارة المتجر فور الاعتماد.
                          </div>
                        )}

                        {status === 'rejected' && (
                          <div className="text-[11px] text-rose-800 bg-rose-100/70 p-2.5 rounded-xl border border-rose-200/80 space-y-1">
                            <span className="font-bold block">سبب الرفض:</span>
                            <span className="block">{c.rejectionReason || 'لم يستوفِ الشروط المعتمدة لدى المنصة'}</span>
                          </div>
                        )}

                        {status === 'stopped' && (
                          <div className="text-[11px] text-zinc-600 bg-zinc-100 p-2 rounded-xl border border-zinc-200">
                            تم إيقاف هذه الحملة وإلغاء تمييز المنتج من صدارة المتجر.
                          </div>
                        )}

                        {/* Functional Action Button for Active Campaigns: Stop/Pause */}
                        {status === 'active' && (
                          <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-700 font-bold">
                              معروض حالياً في الصدارة ⭐
                            </span>
                            <button
                              type="button"
                              disabled={isStoppingCampaign}
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من رغبتك في إيقاف ترويج "${prodName}" فورياً؟ سيتم إخراجه من صدارة القوائم.`)) {
                                  handleStopPromotion(c.id, prodName);
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                              title="إيقاف الترويج الفوري وإلغاء تمييز المنتج"
                            >
                              <PauseCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>إيقاف الترويج</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      );
    })()}

    {/* TAB 3: PRODUCT DRAFTS (مسودات المنتجات) */}
    {merchantTab === 'product_drafts' && (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bookmark className="w-5 h-5 text-purple-700" />
              <h3 className="font-black text-base text-zinc-900">
                مسودات المنتجات المحفوظة ({productDrafts.length})
              </h3>
            </div>
            <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
              منتجات قيد التجهيز قمت بحفظها دون نشر. يمكنك تعديل أي مسودة أو نشرها للمتجر لتبدأ بالظهور للزبائن بنقرة واحدة.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مسودة منتج جديد</span>
          </button>
        </div>

        {productDrafts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-zinc-400 space-y-3">
            <Bookmark className="w-10 h-10 mx-auto text-zinc-300" />
            <p className="font-bold text-zinc-700 text-sm">لا توجد مسودات منتجات محفوظة حالياً</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              عند إضافة منتج جديد، يمكنك الضغط على زر "حفظ كمسودة" لحفظه هنا والرجوع لإكماله لاحقاً.
            </p>
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs transition cursor-pointer"
            >
              إنشاء منتج جديد
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productDrafts.map(draft => (
              <div
                key={draft.id}
                className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-purple-300 transition group"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={draft.imageUrl || '/src/assets/images/product_iraqi_dates_1791352458875.jpg'}
                      alt={draft.name}
                      className="w-14 h-14 rounded-2xl object-cover bg-zinc-100 shrink-0 border border-zinc-200"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/src/assets/images/product_iraqi_dates_1791352458875.jpg';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block mb-1">
                        مسودة
                      </span>
                      <h4 className="font-black text-sm text-zinc-900 truncate">{draft.name}</h4>
                      <span className="text-[11px] text-zinc-500 block">{draft.categoryName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
                    <span className="text-zinc-500">السعر المقترح:</span>
                    <span className="font-black text-purple-950 tabular-nums">
                      {draft.price ? formatIQDTabular(draft.price) : 'غير محدد'}
                    </span>
                  </div>

                  {draft.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {draft.description}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePublishDraftToStore(draft)}
                    className="flex-1 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    title="نشر المسودة فوراً لتصبح منتجاً معروضاً في المتجر"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>نشر للمتجر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditProductDraft(draft)}
                    className="p-2 text-zinc-600 hover:text-purple-700 hover:bg-white rounded-xl border border-zinc-200 transition cursor-pointer"
                    title="تعديل المسودة"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`هل أنت متأكد من حذف المسودة "${draft.name}"؟`)) {
                        handleDeleteProductDraft(draft.id);
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-xl border border-zinc-200 transition cursor-pointer"
                    title="حذف المسودة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* TAB 4: CAMPAIGN DRAFTS (مسودات الحملات الإعلانية) */}
    {merchantTab === 'campaign_drafts' && (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <h3 className="font-black text-base text-zinc-900">
                مسودات الحملات الإعلانية ({campaignDrafts.length})
              </h3>
            </div>
            <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
              إعدادات حملات ترويجية تم حفظها كمسودة. يمكنك تفعيلها وإطلاقها مباشرة بنقرة واحدة دون إعادة إدخال الأيام والأسعار.
            </p>
          </div>

          <button
            onClick={() => setMerchantTab('promotions')}
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء حملة جديدة</span>
          </button>
        </div>

        {campaignDrafts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-zinc-400 space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-zinc-300" />
            <p className="font-bold text-zinc-700 text-sm">لا توجد مسودات حملات محفوظة حالياً</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              عند تحديد خيارات الترويج لأي منتج، يمكنك الضغط على "حفظ كمسودة حملة" للرجوع إليها لاحقاً.
            </p>
            <button
              onClick={() => setMerchantTab('promotions')}
              className="px-5 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs transition cursor-pointer"
            >
              الذهاب للحملات والترويج
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignDrafts.map(draft => (
              <div
                key={draft.id}
                className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-purple-300 transition"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={draft.productImage || '/src/assets/images/product_iraqi_dates_1791352458875.jpg'}
                      alt={draft.productName}
                      className="w-14 h-14 rounded-2xl object-cover bg-zinc-100 shrink-0 border border-zinc-200"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block mb-1">
                        مسودة حملة
                      </span>
                      <h4 className="font-black text-sm text-zinc-900 truncate">{draft.productName}</h4>
                      <span className="text-[11px] text-purple-700 font-bold">المدة: {draft.durationDays} أيام</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-2xl space-y-1.5 text-xs border border-zinc-100">
                    <div className="flex items-center justify-between text-zinc-600">
                      <span>المبلغ قبل الخصم:</span>
                      <span className="font-bold tabular-nums">{formatIQDTabular(draft.subtotal)}</span>
                    </div>
                    {draft.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-700 font-bold">
                        <span>الخصم المطبق ({draft.discountPercent}%):</span>
                        <span className="tabular-nums">-{formatIQDTabular(draft.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between font-black text-purple-950 pt-1 border-t border-zinc-200">
                      <span>الإجمالي المستحق:</span>
                      <span className="tabular-nums">{formatIQDTabular(draft.finalTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleLaunchDraftCampaign(draft)}
                    className="flex-1 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    title="إطلاق وتفعيل الحملة فوراً"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>تفعيل وإطلاق الحملة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`هل أنت متأكد من حذف مسودة حملة "${draft.productName}"؟`)) {
                        handleDeleteCampaignDraft(draft.id);
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-xl border border-zinc-200 transition cursor-pointer"
                    title="حذف المسودة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
            <h3 className="text-lg font-black text-zinc-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-700" />
              <span>{editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمتجر'}</span>
            </h3>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4 font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-zinc-700">اسم المنتج *</label>
                  {prodName.trim() && (
                    <button
                      type="button"
                      onClick={handleAnalyzeProductImage}
                      disabled={isAnalyzingImage}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200"
                      title="توليد الوصف والقسم والوسوم تلقائياً بناءً على هذا الاسم"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>توليد باقي البيانات بالذكاء الاصطناعي ✨</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  placeholder="اكتب الاسم الأساسي (مثل: تراكسود، قندرة، ميز، تمور...) لتوليد البيانات تلقائياً"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">السعر (د.ع) *</label>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={e => setProdPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    السعر السابق (لإظهار الخصم)
                  </label>
                  <input
                    type="number"
                    value={prodOriginalPrice}
                    onChange={e => setProdOriginalPrice(e.target.value)}
                    placeholder="30000"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">القسم *</label>
                <select
                  value={prodCategoryId}
                  onChange={e => setProdCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-zinc-700">صور المنتج ({prodImages.length}) *</label>
                  <span className="text-[11px] text-zinc-400">انقر على "تعيين كرئيسية" لتحديد صورة العرض الأساسية</span>
                </div>

                {/* Grid of uploaded product images */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-3">
                  {prodImages.map((imgUrl, idx) => {
                    const isPrimary = idx === prodPrimaryIndex;
                    return (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-zinc-100 flex flex-col justify-between group transition ${
                          isPrimary ? 'border-purple-600 ring-2 ring-purple-600/30' : 'border-zinc-200'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`صورة ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/src/assets/images/product_iraqi_dates_1791352458875.jpg';
                          }}
                        />
                        {isPrimary && (
                          <span className="absolute top-1 right-1 bg-purple-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            رئيسية ⭐
                          </span>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 p-1">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => setProdPrimaryIndex(idx)}
                              className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              تعيين رئيسية
                            </button>
                          )}
                          {prodImages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextImgs = prodImages.filter((_, i) => i !== idx);
                                setProdImages(nextImgs);
                                if (prodPrimaryIndex >= nextImgs.length) {
                                  setProdPrimaryIndex(0);
                                }
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Image Button */}
                  <label className="border-2 border-dashed border-zinc-300 hover:border-purple-600 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition bg-zinc-50 hover:bg-white text-zinc-500 hover:text-purple-700">
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold text-center leading-tight">إضافة صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAddProductImageFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Prominent AI Product Analysis & Auto Field Extraction Button */}
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={handleAnalyzeProductImage}
                    disabled={isAnalyzingImage}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-800 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer border border-purple-400/30"
                    title="تحليل صورة المنتج أو اسمه الأساسي وتوليد الاسم والوصف وتحديد القسم تلقائياً بالذكاء الاصطناعي"
                  >
                    {isAnalyzingImage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                        <span>جارٍ التوليد بواسطة الذكاء الاصطناعي...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
                        <span className="tracking-wide">👉 [ 📸✨ توليد الاسم والوصف وتحديد القسم بالذكاء الاصطناعي ]</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center font-medium">
                    يعمل تلقائياً عند رفع صورة المنتج أو كتابة اسمه الأساسي في الحقل أعلاه
                  </p>

                  {/* Toast & Feedback Alert */}
                  {aiToast && (
                    <div
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition animate-in fade-in ${
                        aiToast.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                          : aiToast.type === 'error'
                          ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-xs'
                          : 'bg-purple-50 text-purple-900 border-purple-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {aiToast.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : aiToast.type === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
                        )}
                        <span>{aiToast.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiToast(null)}
                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer font-bold text-sm"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {aiAnalysisSuccessMsg && !aiToast && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{aiAnalysisSuccessMsg}</span>
                    </div>
                  )}

                  {prodTags.length > 0 && (
                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-purple-700" />
                          وسوم وكلمات مفتاحية محلية مستخرجة (Auto Tags):
                        </span>
                        <span className="text-[10px] text-purple-600">محفوظة لمحرك البحث مجاناً</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {prodTags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-purple-300 text-purple-800 text-[11px] font-bold rounded-lg shadow-2xs"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => setProdTags(prev => prev.filter((_, i) => i !== tIdx))}
                              className="text-zinc-400 hover:text-rose-600 ml-0.5 cursor-pointer font-bold"
                              title="إزالة الوسم"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Description Field with Marketing & Copywriting Assistant */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block font-bold text-zinc-700">وصف المنتج ومواصفاته</label>

                  {/* Marketing & Copywriting Assistant Button */}
                  <button
                    type="button"
                    onClick={handleGenerateMarketingAd}
                    disabled={isGeneratingMarketingAd}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-60 active:scale-95 border border-amber-300/30"
                    title="توليد منشور إعلاني جاهز للنشر على إنستغرام أو تيك توك مع هاشتاقات وعبارات تسويقية"
                  >
                    {isGeneratingMarketingAd ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>جارٍ صياغة الإعلان...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                        <span>✨ اقتراح نصوص ترويجية للإعلانات</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={prodDesc}
                  onChange={e => setProdDesc(e.target.value)}
                  placeholder="اكتب وصفاً دقيقاً للمنتج ومحتوياته، أو انقر على أزرار الذكاء الاصطناعي أعلاه للتوليد التلقائي..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 text-xs"
                />

                {/* Sub-section: Marketing & Copywriting Assistant Display Card */}
                {showMarketingAdSection && (
                  <div className="p-4 bg-gradient-to-br from-purple-50/90 via-white to-amber-50/80 border border-purple-200 rounded-2xl space-y-3 shadow-xs animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                          <Megaphone className="w-4 h-4 animate-bounce" />
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                            <span>منشور إعلاني جاهز للترويج (Instagram & TikTok Ad)</span>
                          </h4>
                          <p className="text-[10px] text-zinc-500">
                            صياغة تسويقية عراقية مع هوك لافت، أسعار، تفاصيل توصيل وهاشتاقات متفاعلة
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleGenerateMarketingAd}
                          disabled={isGeneratingMarketingAd}
                          className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                          title="توليد صيغة إعلانية بديلة"
                        >
                          {isGeneratingMarketingAd ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                          <span>صيغة أخرى 🔄</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMarketingAdSection(false)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer text-sm font-bold"
                          title="إغلاق القسم"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {isGeneratingMarketingAd && !marketingAdCopy && (
                      <div className="py-6 text-center text-xs text-purple-700 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        <span className="font-bold">جارٍ صياغة وتوليد الإعلان بالذكاء الاصطناعي بلهجة عراقية جذابة...</span>
                      </div>
                    )}

                    {marketingAdCopy && (
                      <div className="space-y-2.5">
                        <div className="p-3.5 bg-white border border-purple-200/80 rounded-xl text-xs text-zinc-800 leading-relaxed font-sans whitespace-pre-wrap max-h-56 overflow-y-auto selection:bg-purple-200 shadow-2xs">
                          {marketingAdCopy}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCopyMarketingAd}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs transition cursor-pointer shadow-xs active:scale-98 ${
                              isMarketingAdCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white'
                            }`}
                          >
                            {isMarketingAdCopied ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                <span>تم نسخ المنشور الإعلاني للحافظة! جاهز للنشر ✅</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>📋 نسخ المنشور الإعلاني للنشر فوراً</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setProdDesc(marketingAdCopy);
                              setAiToast({
                                type: 'success',
                                message: 'تم تعيين النص الترويجي كوصف رسمي للمنتج! ✨',
                              });
                              setTimeout(() => setAiToast(null), 3500);
                            }}
                            className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold text-xs cursor-pointer transition border border-zinc-200"
                            title="إدراج هذا النص في حقل وصف المنتج أعلاه"
                          >
                            تعيين كوصف للمنتج 📝
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stockCheck"
                  checked={prodInStock}
                  onChange={e => setProdInStock(e.target.checked)}
                  className="rounded text-purple-700 focus:ring-purple-600 cursor-pointer"
                />
                <label htmlFor="stockCheck" className="font-bold text-zinc-800 cursor-pointer">
                  المنتج متوفر حالياً في المخزن وجاهز للشحن
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-100 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveProductDraft}
                  className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
                  title="حفظ بيانات المنتج الحالية كمسودة في قسم مسوداتي دون إرساله للنشر بعد"
                >
                  <Bookmark className="w-3.5 h-3.5 text-purple-700" />
                  <span>حفظ كمسودة</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductModalOpen(false);
                      setEditingDraftId(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold cursor-pointer text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer shadow-xs text-xs flex items-center gap-1.5"
                  >
                    <span>{editingProduct ? 'تحديث ونشر المنتج' : 'حفظ ونشر في المتجر'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Store Info Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
            <h3 className="text-lg font-black text-zinc-900 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-700" />
              <span>إدارة وتعديل بيانات المتجر</span>
            </h3>

            {storeModalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-4 font-bold">
                {storeModalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">اسم المتجر *</label>
                <input
                  type="text"
                  required
                  value={storeNameInput}
                  onChange={e => setStoreNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">المحافظة التابع لها المتجر *</label>
                <select
                  value={storeGovInput}
                  onChange={e => setStoreGovInput(e.target.value as IraqiGovernorate)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-600/30"
                >
                  {IRAQI_GOVERNORATES.map(gov => (
                    <option key={gov.id} value={gov.id}>
                      {gov.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">هاتف التواصل للمتجر *</label>
                <input
                  type="tel"
                  required
                  value={storePhoneInput}
                  onChange={e => setStorePhoneInput(e.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">نبذة ووصف المتجر</label>
                <textarea
                  rows={3}
                  value={storeDescInput}
                  onChange={e => setStoreDescInput(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer shadow-xs"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Paid In-App Promotion Modal */}
      {/* Modal 3: Paid In-App Promotion Modal with Automatic Discounts Calculator */}
      {promotingProduct && (() => {
        const modalPricing = calculateCampaignPricing(modalDurationDays);
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-zinc-100 text-right">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 fill-purple-600 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-zinc-900">ترويج المنتج في دكانة</h3>
                    <p className="text-xs text-zinc-500">حاسبة الأيام التلقائية والخصومات الفورية (5,000 د.ع / اليوم)</p>
                  </div>
                </div>
                <button
                  onClick={() => setPromotingProduct(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Product preview */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-center gap-3">
                <img
                  src={promotingProduct.imageUrl}
                  alt={promotingProduct.name}
                  className="w-14 h-14 rounded-xl object-cover bg-white shrink-0 border border-zinc-200"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-zinc-900 block truncate">{promotingProduct.name}</span>
                  <span className="text-[11px] text-zinc-500 block">{promotingProduct.categoryName}</span>
                  <span className="text-xs font-black text-purple-950 block mt-0.5">{formatIQDTabular(promotingProduct.finalPrice)}</span>
                </div>
              </div>

              {/* Days Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-zinc-800">عدد أيام الترويج المطلوبة:</label>
                  <span className="text-purple-700 font-bold font-mono">5,000 د.ع / اليوم</span>
                </div>
                
                {/* Stepper + Number */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalDurationDays(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-black text-lg flex items-center justify-center transition cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={modalDurationDays}
                    onChange={e => setModalDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 py-2 px-3 text-center font-black text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
                  />
                  <button
                    type="button"
                    onClick={() => setModalDurationDays(prev => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-black text-lg flex items-center justify-center transition cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Quick Select Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
                  {[
                    { days: 3, label: '3 أيام' },
                    { days: 7, label: 'أسبوع (15%)' },
                    { days: 14, label: 'أسبوعين (25%)' },
                    { days: 30, label: 'شهر كامل' },
                  ].map(p => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setModalDurationDays(p.days)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                        modalDurationDays === p.days
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Badge */}
              {modalPricing.discountPct > 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>{modalPricing.badgeText}</span>
                  </span>
                  <span className="font-bold text-emerald-700">وفر {formatIQDTabular(modalPricing.savings)}</span>
                </div>
              ) : (
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] text-zinc-500 text-center">
                  اختر 7 أيام أو أكثر للحصول على خصم 15%، أو 14 يوماً لخصم 25% تلقائياً
                </div>
              )}

              {/* Real-time Invoice Card */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-600">
                  <span>المبلغ قبل الخصم ({modalPricing.days} أيام × 5,000 د.ع):</span>
                  <span className="font-bold text-zinc-900 tabular-nums">{formatIQDTabular(modalPricing.gross)}</span>
                </div>
                {modalPricing.savings > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-bold">
                    <span>قيمة الخصم المقتطع ({modalPricing.discountPct}%):</span>
                    <span className="tabular-nums">-{formatIQDTabular(modalPricing.savings)}</span>
                  </div>
                )}
                <div className="border-t border-purple-200 pt-2 flex items-center justify-between">
                  <div>
                    <span className="font-black text-purple-950 block text-xs">المبلغ النهائي الإجمالي المستحق:</span>
                    <span className="text-[10px] text-purple-700">بالدينار العراقي</span>
                  </div>
                  <span className="text-lg font-black text-purple-950 tabular-nums">
                    {formatIQDTabular(modalPricing.finalTotal)}
                  </span>
                </div>
              </div>

              {/* Buttons: Confirm & Save Draft */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isLaunchingCampaign}
                  onClick={() => handleLaunchCommercialCampaign(promotingProduct.id, modalDurationDays)}
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{isLaunchingCampaign ? 'جاري إرسال طلب الترويج...' : `إرسال طلب الترويج للإدارة (${formatIQDTabular(modalPricing.finalTotal)})`}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveCampaignDraft(promotingProduct.id, modalDurationDays)}
                    className="flex-1 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-purple-700" />
                    <span>حفظ كمسودة حملة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromotingProduct(null)}
                    className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 4: Dedicated "Manage Product Images" Modal */}
      {managingImagesProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-700" />
                  <span>إدارة صور المنتج: {managingImagesProduct.name}</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  تعديل الصور، إضافة صور جديدة، أو تحديد الصورة الرئيسية للمنتج في أي وقت بعد النشر.
                </p>
              </div>
              <button
                onClick={() => setManagingImagesProduct(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {manageImagesSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-4 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{manageImagesSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <span className="block font-bold text-zinc-700 mb-2">
                  صور المنتج الحالية ({manageImagesList.length})
                </span>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {manageImagesList.map((imgUrl, idx) => {
                    const isPrimary = idx === manageImagesPrimaryIndex;
                    return (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 bg-zinc-100 flex flex-col justify-between group transition ${
                          isPrimary ? 'border-purple-600 ring-2 ring-purple-600/30' : 'border-zinc-200'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`صورة ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/src/assets/images/product_iraqi_dates_1791352458875.jpg';
                          }}
                        />
                        {isPrimary && (
                          <span className="absolute top-1.5 right-1.5 bg-purple-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            رئيسية ⭐
                          </span>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1.5 p-1">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => setManageImagesPrimaryIndex(idx)}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              تعيين رئيسية
                            </button>
                          )}
                          {manageImagesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextImgs = manageImagesList.filter((_, i) => i !== idx);
                                setManageImagesList(nextImgs);
                                if (manageImagesPrimaryIndex >= nextImgs.length) {
                                  setManageImagesPrimaryIndex(0);
                                }
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              حذف الصورة
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Photo Box */}
                  <label className="border-2 border-dashed border-zinc-300 hover:border-purple-600 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer transition bg-zinc-50 hover:bg-white text-zinc-500 hover:text-purple-700">
                    <Plus className="w-6 h-6 mb-1" />
                    <span className="text-[11px] font-bold text-center leading-tight">إضافة صورة جديدة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAddQuickImageFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setManagingImagesProduct(null)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveManagingImages}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer shadow-xs transition"
                >
                  حفظ صور المنتج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Add Store Image Modal */}
      {isAddStoreImageModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-700" />
                <span>إضافة صورة جديدة لمتجرك</span>
              </h3>
              <button
                onClick={() => setIsAddStoreImageModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {storeImageError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4 font-bold">
                {storeImageError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <label className="border-2 border-dashed border-zinc-200 hover:border-purple-600 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-zinc-50 hover:bg-white text-center">
                <Upload className="w-7 h-7 text-purple-600 mb-2" />
                <span className="font-bold text-zinc-800 text-sm">اختر صورة من جهازك لرفعها</span>
                <span className="text-[11px] text-zinc-400 mt-1">تتم معالجة الصورة وضغطها بدقة عالية للحفاظ على السرعة</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddStoreImageUpload}
                  className="hidden"
                />
              </label>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] text-zinc-400 absolute">أو أدخل رابط / مسار الصورة</span>
              </div>

              <div>
                <input
                  type="text"
                  value={newStoreImageUrl}
                  onChange={e => setNewStoreImageUrl(e.target.value)}
                  placeholder="/src/assets/images/... أو رابط URL"
                  dir="ltr"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              {newStoreImageUrl && (
                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                  <img
                    src={newStoreImageUrl}
                    alt="معاينة"
                    className="w-full h-full object-cover"
                    onError={() => setStoreImageError('تعذر تحميل الصورة من الرابط المدخل')}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStoreImageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!newStoreImageUrl.trim()}
                  onClick={() => {
                    if (!newStoreImageUrl.trim()) return;
                    const updated = [...currentStoreImages, newStoreImageUrl.trim()];
                    updateStoreImages(store.id, updated, store.coverUrl || newStoreImageUrl.trim());
                    setStoreImagesSuccessMsg('تمت إضافة صورة المتجر بنجاح.');
                    setTimeout(() => setStoreImagesSuccessMsg(''), 3000);
                    setIsAddStoreImageModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white font-bold cursor-pointer shadow-xs transition"
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Store Customer View Preview */}
      <StoreDetailModal
        merchantId={store.id}
        isOpen={isPreviewStoreOpen}
        onClose={() => setIsPreviewStoreOpen(false)}
        onSelectProduct={() => {}}
      />
    </div>
  );
};
