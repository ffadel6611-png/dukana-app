import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Star,
  Check,
  ShoppingBag,
  Flag,
  ShieldCheck,
  Plus,
  Minus,
  MessageSquare,
  BadgeCheck,
  Heart,
} from 'lucide-react';
import { Product, Review } from '../types';
import { formatIQDTabular } from '../utils/currency';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SocialShareBar } from './SocialShare';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenReviewModal: (productId: string, orderId: string) => void;
  onOpenReportModal: (review: Review) => void;
  onOpenStore?: (merchantId: string) => void;
  onOpenChat?: (merchantId: string, productId?: string, storeName?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenReviewModal,
  onOpenReportModal,
  onOpenStore,
  onOpenChat,
}) => {
  const { addToCart, getProductReviews, canUserReviewProduct, isInWishlist, toggleWishlist } = useMarket();
  const { currentUser, isAuthenticated } = useAuth();
  const { lang, t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [isAddedRecently, setIsAddedRecently] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isFav = product ? isInWishlist(product.id) : false;

  useEffect(() => {
    setQuantity(1);
    setIsAddedRecently(false);
    setActiveImageIndex(0);
  }, [product?.id]);

  if (!product) return null;

  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
      ? [product.imageUrl]
      : ['/src/assets/images/hero_dukkana_market_1791352449347.jpg'];

  const displayedImage = productImages[activeImageIndex] || product.imageUrl;

  const reviews = getProductReviews(product.id);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  // Star distribution
  const starCounts = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage:
      reviews.length > 0
        ? Math.round((reviews.filter(r => r.rating === stars).length / reviews.length) * 100)
        : 0,
  }));

  const reviewPermission = currentUser
    ? canUserReviewProduct(currentUser.id, product.id)
    : { canReview: false, reason: 'يرجى تسجيل الدخول أولاً للتحقق من مشترياتك.' };

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addToCart(product, quantity);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-zinc-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-white/90 shadow-md text-zinc-600 hover:text-zinc-950 flex items-center justify-center cursor-pointer transition"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Product Image Column with Multi-Image Support */}
          <div className="flex flex-col bg-zinc-100">
            <div className="relative aspect-4/3 md:aspect-auto md:h-80 overflow-hidden bg-zinc-200">
              <img
                src={displayedImage}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={e => {
                  (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                }}
                className="w-full h-full object-cover transition-all duration-300"
              />
              {product.discountPercent && product.discountPercent > 0 && (
                <div className="absolute top-4 right-4 bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                  خصم {product.discountPercent}%
                </div>
              )}
              {productImages.length > 1 && (
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                  {activeImageIndex + 1} / {productImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail selector strip if product has multiple images */}
            {productImages.length > 1 && (
              <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-purple-600 ring-2 ring-purple-600/30'
                        : 'border-zinc-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`صورة ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Column */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              {/* Category & Store */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                <span>{product.categoryName}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenStore) {
                      onOpenStore(product.merchantId);
                    }
                  }}
                  className="flex items-center gap-1 text-purple-700 font-bold hover:underline cursor-pointer"
                  title="عرض متجر التاجر"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{product.storeName}</span>
                </button>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 leading-snug">
                {product.name}
              </h2>

              {/* Rating header */}
              {avgRating ? (
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-700 font-bold">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(Number(avgRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="tabular-nums font-black">{avgRating} {lang === 'ku' ? 'لە ٥' : 'من 5'}</span>
                  <span className="text-zinc-400 text-xs font-normal">({reviews.length} {t('product_verified_reviews', 'تقييم موثق')})</span>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 mt-2">{t('product_no_reviews', 'لا توجد تقييمات موثقة بعد لهذا المنتج')}</div>
              )}

              {/* Price display */}
              <div className="mt-4 p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-zinc-500 font-medium ml-2">{t('product_current_price', 'السعر الحالي:')}</span>
                  <span className="text-2xl font-black text-purple-950 tabular-nums">
                    {formatIQDTabular(product.finalPrice)}
                  </span>
                </div>
                {product.originalPrice && product.originalPrice > product.finalPrice && (
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 line-through tabular-nums block">
                      {formatIQDTabular(product.originalPrice)}
                    </span>
                    <span className="text-[11px] font-bold text-rose-600">
                      {t('product_saved', 'وفرت')} {formatIQDTabular(product.originalPrice - product.finalPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-4">
                <h4 className="text-xs font-bold text-zinc-900 mb-1">{t('product_details_title', 'تفاصيل المنتج:')}</h4>
                <p className="text-sm text-zinc-600 leading-relaxed max-h-40 overflow-y-auto">
                  {product.description}
                </p>
              </div>

              {/* COD & Quality Assurance badge */}
              <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
                <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                <span>{t('product_cod_guarantee', 'الدفع نقداً عند الاستلام بعد معاينة المنتج والتحقق من جودته.')}</span>
              </div>
            </div>

            {/* Actions: Stepper + Add to Cart */}
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-sm tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                  !product.inStock
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                    : isAddedRecently
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-700/20'
                }`}
              >
                {isAddedRecently ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{t('btn_added', 'تمت الإضافة للسلة!')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    <span>{t('btn_add_to_cart', 'إضافة إلى السلة')} ({formatIQDTabular(product.finalPrice * quantity)})</span>
                  </>
                )}
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs ${
                  isFav
                    ? 'bg-rose-50 border-rose-300 text-rose-600'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:text-rose-600 hover:bg-rose-50/50'
                }`}
                title={isFav ? t('wishlist_remove', 'إزالة من المفضلة') : t('wishlist_add', 'إضافة إلى المفضلة')}
                aria-label={isFav ? t('wishlist_remove', 'إزالة من المفضلة') : t('wishlist_add', 'إضافة إلى المفضلة')}
              >
                <Heart
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isFav ? 'fill-rose-500 text-rose-500 scale-110' : ''
                  }`}
                />
              </button>
            </div>

            {/* Direct Merchant Chat Action */}
            {onOpenChat && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onOpenChat(product.merchantId, product.id, product.storeName)}
                  className="w-full py-2.5 px-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-purple-700" />
                  <span>{t('product_chat_merchant', 'محادثة التاجر والاستفسار عن هذا المنتج')}</span>
                </button>
              </div>
            )}

            {/* Quick Social Share (WhatsApp & Telegram Direct Buttons) */}
            <SocialShareBar product={product} />
          </div>
        </div>

        {/* Verified Reviews Section (Apple & Google Compliant UGC System) */}
        <div className="p-6 bg-zinc-50 border-t border-zinc-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-700" />
                <span>تقييمات المشترين الموثقة</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                نظام دكانة يمنع التقييمات الوهمية تماماً. التقييم متاح فقط لمن أتم الشراء واستلم الطلب.
              </p>
            </div>

            {/* Add Review Button (Permitted only if verified delivered purchase) */}
            {reviewPermission.canReview ? (
              <button
                onClick={() => {
                  if (reviewPermission.orderId) {
                    onOpenReviewModal(product.id, reviewPermission.orderId);
                  }
                }}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                + كتابة تقييم موثق
              </button>
            ) : (
              <div className="text-[11px] text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg">
                {reviewPermission.reason}
              </div>
            )}
          </div>

          {/* Rating Summary Breakdown */}
          {reviews.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-2xl border border-zinc-200">
              <div className="flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-l border-zinc-100 pb-3 sm:pb-0">
                <span className="text-4xl font-black text-zinc-900 tabular-nums">
                  {avgRating}
                </span>
                <div className="flex items-center my-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(Number(avgRating))
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-zinc-500">إجمالي {reviews.length} تقييم</span>
              </div>

              {/* Star Distribution Bars */}
              <div className="sm:col-span-2 space-y-1.5 justify-center flex flex-col">
                {starCounts.map(item => (
                  <div key={item.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-8 font-semibold text-zinc-700 text-right">{item.stars} نجوم</span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="w-10 text-left text-zinc-400 tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review List */}
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-sm">
                لم يتم إضافة تقييمات موثقة بعد لهذا المنتج.
              </div>
            ) : (
              reviews.map(rev => (
                <div
                  key={rev.id}
                  className="bg-white p-4 rounded-2xl border border-zinc-200 text-right space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center">
                        {rev.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>{rev.userName}</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            عملية شراء موثقة
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          رقم الطلب: {rev.orderId} · {new Date(rev.createdAt).toLocaleDateString('ar-IQ')}
                        </div>
                      </div>
                    </div>

                    {/* Report Review Button */}
                    <button
                      onClick={() => onOpenReportModal(rev)}
                      className="text-zinc-400 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer transition"
                      title="الإبلاغ عن محتوى أو تقييم مخالف"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">إبلاغ</span>
                    </button>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  {rev.comment && (
                    <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                      {rev.comment}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
