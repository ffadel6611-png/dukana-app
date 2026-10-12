import React, { useState } from 'react';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Store,
  Star,
  Check,
  ArrowRight,
  Package,
  Sparkles,
  ShoppingBasket,
  ChevronLeft,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';
import { Product } from '../types';
import { formatIQDTabular } from '../utils/currency';

interface WishlistViewProps {
  onSelectProduct: (product: Product) => void;
  onOpenStore?: (merchantId: string) => void;
  onNavigateHome: () => void;
  onNavigateCategories: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  onSelectProduct,
  onOpenStore,
  onNavigateHome,
  onNavigateCategories,
}) => {
  const { lang, t } = useLanguage();
  const {
    products,
    wishlist,
    removeFromWishlist,
    clearWishlist,
    addToCart,
    getProductReviews,
  } = useMarket();

  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Filter products that exist in the wishlist
  const favoriteProducts = products.filter(p => wishlist.includes(p.id));

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!product.inStock) return;
    addToCart(product, 1);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  const handleAddAllInStockToCart = () => {
    const inStockItems = favoriteProducts.filter(p => p.inStock);
    if (inStockItems.length === 0) return;
    setIsBulkAdding(true);
    inStockItems.forEach(item => {
      addToCart(item, 1);
    });
    setTimeout(() => {
      setIsBulkAdding(false);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-xs">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
                <span>{t('wishlist_title', 'قائمة المنتجات المفضلة')}</span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  {favoriteProducts.length} {t('wishlist_items_count', 'منتج محفوظ')}
                </span>
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {t('wishlist_subtitle', 'المنتجات التي قمت بحفظها للرجوع إليها وشرائها بسهولة للدفع عند الاستلام.')}
              </p>
            </div>
          </div>
        </div>

        {favoriteProducts.length > 0 && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleAddAllInStockToCart}
              disabled={isBulkAdding || !favoriteProducts.some(p => p.inStock)}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isBulkAdding ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t('btn_added', 'تمت الإضافة للسلة!')}</span>
                </>
              ) : (
                <>
                  <ShoppingBasket className="w-4 h-4" />
                  <span>{t('wishlist_bulk_add', 'إضافة المتوفر للسلة')}</span>
                </>
              )}
            </button>

            <button
              onClick={clearWishlist}
              className="px-3 py-2 rounded-xl border border-zinc-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-zinc-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              title={t('btn_clear', 'تفريغ')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('btn_clear', 'تفريغ')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {favoriteProducts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-zinc-200 p-8 space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-400 mx-auto flex items-center justify-center border border-rose-100">
            <Heart className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-zinc-900">{t('wishlist_empty', 'قائمة المفضلة فارغة حالياً')}</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              {t('wishlist_empty_desc', 'لم تقم بإضافة أي منتجات إلى قائمة المفضلة بعد. انقر على رمز القلب على أي منتج لحفظه هنا والرجوع إليه في أي وقت.')}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={onNavigateCategories}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>استكشف الأقسام والمنتجات</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs transition cursor-pointer"
            >
              <span>العودة للرئيسية</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {favoriteProducts.map(product => {
            const isAdded = addedIds[product.id];
            const reviews = getProductReviews(product.id);
            const avgRating =
              reviews.length > 0
                ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                : null;

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="group bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer"
              >
                {/* Image slot */}
                <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      removeFromWishlist(product.id);
                    }}
                    className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-xs text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition cursor-pointer"
                    title="إزالة من المفضلة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Discount Badge */}
                  {product.discountPercent && product.discountPercent > 0 && (
                    <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs z-10">
                      خصم {product.discountPercent}%
                    </div>
                  )}

                  {/* Stock status */}
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10">
                      <span className="bg-zinc-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                        نفدت الكمية
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between">
                  <div>
                    {/* Store & Category */}
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
                      <span className="truncate">{product.categoryName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate text-purple-900 font-bold">{product.storeName}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-purple-900 transition-colors">
                      {product.name}
                    </h3>

                    {/* Rating */}
                    {avgRating && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums">{avgRating}</span>
                        <span className="text-zinc-400 font-normal text-[10px]">({reviews.length})</span>
                      </div>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm sm:text-base font-black text-purple-950 tabular-nums">
                        {formatIQDTabular(product.finalPrice)}
                      </div>
                      {product.originalPrice && product.originalPrice > product.finalPrice && (
                        <div className="text-[11px] text-zinc-400 line-through tabular-nums -mt-0.5">
                          {formatIQDTabular(product.originalPrice)}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={e => handleAddToCart(e, product)}
                      disabled={!product.inStock}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        !product.inStock
                          ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                          : isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>أُضيف!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>أضف</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
