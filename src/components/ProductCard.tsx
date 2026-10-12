import React, { useState } from 'react';
import { ShoppingBag, Star, Store, Check, AlertCircle, Sparkles, Heart } from 'lucide-react';
import { Product } from '../types';
import { formatIQDTabular } from '../utils/currency';
import { useMarket } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';
import { WhatsAppIcon, TelegramIcon, buildProductSharePayload } from './SocialShare';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onOpenStore?: (merchantId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onSelectProduct,
  onOpenStore,
}) => {
  const { addToCart, getProductReviews, isInWishlist, toggleWishlist } = useMarket();
  const { lang, t } = useLanguage();
  const [isAddedRecently, setIsAddedRecently] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const isFav = isInWishlist(product.id);
  const sharePayload = buildProductSharePayload(product, lang);

  const reviews = getProductReviews(product.id);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock) return;
    addToCart(product, 1);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1500);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleCardClick = () => {
    if (onSelect) onSelect(product);
    else if (onSelectProduct) onSelectProduct(product);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white rounded-2xl border border-purple-100/80 hover:border-purple-300 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
    >
      {/* Product Image Slot: Consistent Square Aspect Ratio */}
      <div className="relative aspect-square w-full bg-zinc-100 overflow-hidden">
        {!imageFailed && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-100/50 to-zinc-100 text-purple-900">
            <Store className="w-8 h-8 opacity-40 mb-1" />
            <span className="text-xs font-bold text-center line-clamp-1">{product.name}</span>
          </div>
        )}

        {/* Wishlist Circular Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className={`absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs ${
            isFav
              ? 'bg-white text-rose-600 scale-105'
              : 'bg-white/90 backdrop-blur-md text-zinc-400 hover:text-rose-600 hover:bg-white hover:scale-105'
          }`}
          title={isFav ? t('wishlist_remove', 'إزالة من المفضلة') : t('wishlist_add', 'إضافة إلى المفضلة')}
          aria-label={isFav ? t('wishlist_remove', 'إزالة من المفضلة') : t('wishlist_add', 'إضافة إلى المفضلة')}
        >
          <Heart
            className={`w-4 h-4 transition-transform duration-200 ${
              isFav ? 'fill-rose-500 text-rose-500 scale-110' : ''
            }`}
          />
        </button>

        {/* Promoted / Featured Badge */}
        {(product.isPromoted || product.featured) && (
          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-purple-900 via-purple-700 to-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-sm border border-purple-400/30 flex items-center gap-1 z-10 animate-in fade-in">
            <Sparkles className="w-3 h-3 text-purple-200 fill-purple-200" />
            <span>{t('badge_promoted', 'مُميّز')}</span>
          </div>
        )}

        {/* Discount Badge */}
        {product.discountPercent && product.discountPercent > 0 && (
          <div className="absolute bottom-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs z-10">
            {t('badge_discount', 'خصم')} {product.discountPercent}%
          </div>
        )}

        {/* Stock Status Indicator */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="bg-zinc-800 text-white text-xs font-bold px-3 py-1 rounded-md">
              {t('badge_out_of_stock', 'نفدت الكمية حالياً')}
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between">
        <div>
          {/* Metadata: Category & Store */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5">
            <span className="truncate">{product.categoryName}</span>
            <span aria-hidden="true">·</span>
            {onOpenStore ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenStore(product.merchantId);
                }}
                className="flex items-center gap-1 text-purple-800 hover:text-purple-950 font-semibold truncate hover:underline cursor-pointer"
                title={`زيارة متجر ${product.storeName}`}
              >
                <Store className="w-3 h-3 shrink-0" />
                <span className="truncate">{product.storeName}</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-purple-800 font-semibold truncate">
                <Store className="w-3 h-3 shrink-0" />
                <span className="truncate">{product.storeName}</span>
              </span>
            )}
          </div>

          {/* Product Title: Max 2 lines with ellipsis (...) and consistent height */}
          <h3 className="text-xs sm:text-sm font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-purple-900 transition-colors h-8 sm:h-10 overflow-hidden text-ellipsis">
            {product.name}
          </h3>

          {/* Rating Summary (if exists) */}
          {avgRating && (
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{avgRating}</span>
              <span className="text-zinc-400 font-normal text-[11px]">
                ({reviews.length} {t('badge_review', 'تقييم')})
              </span>
            </div>
          )}
        </div>

        {/* Price & Action Footer with Circular Share Buttons */}
        <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-purple-50 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Prominent Price */}
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-base font-black text-purple-950 tabular-nums truncate">
              {formatIQDTabular(product.finalPrice)}
            </div>
            {product.originalPrice && product.originalPrice > product.finalPrice && (
              <div className="text-[10px] sm:text-xs text-zinc-400 line-through tabular-nums -mt-0.5 truncate">
                {formatIQDTabular(product.originalPrice)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Small & Elegant Circular Share Buttons (WhatsApp & Telegram) */}
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <a
                href={sharePayload.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-95 shrink-0"
                title={t('share_whatsapp', 'مشاركة عبر واتساب')}
                aria-label="مشاركة عبر واتساب"
              >
                <WhatsAppIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
              </a>

              <a
                href={sharePayload.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-95 shrink-0"
                title={t('share_telegram', 'مشاركة عبر تليجرام')}
                aria-label="مشاركة عبر تليجرام"
              >
                <TelegramIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
              </a>
            </div>

            {/* Add to Cart button */}
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className={`min-h-[28px] sm:min-h-[32px] px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                !product.inStock
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : isAddedRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-purple-700 hover:bg-purple-800 text-white shadow-2xs hover:shadow-xs'
              }`}
            >
              {isAddedRecently ? (
                <>
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="inline">{t('btn_added', 'تم!')}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{t('btn_add', 'أضف')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
