import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Store,
  ShoppingBag,
  ArrowLeft,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';
import { formatIQDTabular } from '../utils/currency';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  const { lang, t } = useLanguage();
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    getCartGroupsByMerchant,
    getCartTotalCount,
  } = useMarket();

  if (!isOpen) return null;

  const merchantGroups = getCartGroupsByMerchant();
  const totalCount = getCartTotalCount();
  const subtotalSum = cart.reduce(
    (sum, item) => sum + item.product.finalPrice * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
        {/* Cart Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-700" />
            <h2 className="text-base font-black text-zinc-900">
              {t('cart_title', 'سلة المشتريات')} ({totalCount})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold p-1 cursor-pointer"
              >
                {t('cart_clear', 'تفريغ السلة')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Vendor Alert Notice */}
        {merchantGroups.length > 1 && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black block mb-0.5">{lang === 'ku' ? 'سەبەتەی فرە فرۆشگا:' : 'سلة متعددة المتاجر:'}</span>
              {lang === 'ku' ? `سەبەتەکەت بەرهەمی لە ${merchantGroups.length} فرۆشگای جیاواز تێدایە. بۆ هەر فرۆشگایەک داواکارییەکی سەربەخۆ دروست دەکرێت.` : `تحتوي سلتك على منتجات من ${merchantGroups.length} متاجر مختلفة. سيتم إصدار طلب مستقل لكل متجر ليتولى التجهيز والتوصيل بنفسه.`}
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <ShoppingBag className="w-16 h-16 stroke-1 text-zinc-300 mb-3" />
              <h3 className="text-base font-bold text-zinc-700 mb-1">{t('cart_empty', 'السلة فارغة حالياً')}</h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                {t('cart_empty_desc', 'ابدأ بالتسوق وأضف منتجاتك المفضلة للدفع عند الاستلام')}
              </p>
            </div>
          ) : (
            merchantGroups.map(group => (
              <div
                key={group.merchantId}
                className="rounded-2xl border border-zinc-200/90 overflow-hidden bg-zinc-50/50"
              >
                {/* Merchant Store Header */}
                <div className="px-3.5 py-2.5 bg-purple-100/50 border-b border-purple-200/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900">
                    <Store className="w-3.5 h-3.5 text-purple-700" />
                    <span>متجر: {group.storeName}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    {group.items.length} منتج
                  </span>
                </div>

                {/* Items in this merchant group */}
                <div className="divide-y divide-zinc-200/60 p-2 space-y-2">
                  {group.items.map(item => (
                    <div
                      key={item.product.id}
                      className="p-2 flex items-center gap-3 bg-white rounded-xl"
                    >
                      {/* Thumbnail */}
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-lg object-cover bg-zinc-100 shrink-0"
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-zinc-900 truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-xs font-black text-purple-950 mt-0.5 tabular-nums">
                          {formatIQDTabular(item.product.finalPrice)}
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50">
                            <button
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity - 1)
                              }
                              className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 rounded-r-lg cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-bold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity + 1)
                              }
                              className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 rounded-l-lg cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                            title="إزالة المنتج"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-left font-black text-xs text-zinc-800 tabular-nums">
                        {formatIQDTabular(item.product.finalPrice * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-zinc-200 bg-white space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 font-medium">{t('cart_subtotal', 'مجموع المنتجات:')}</span>
              <span className="text-lg font-black text-purple-950 tabular-nums">
                {formatIQDTabular(subtotalSum)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-zinc-400" />
                {t('cart_delivery', 'أجور التوصيل:')}
              </span>
              <span>{lang === 'ku' ? 'لە کاتی تەواوکردنی داواکاری دیاری دەکرێت' : 'تُحسب عند إتمام الطلب حسب المحافظة'}</span>
            </div>

            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full h-12 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-700/20 transition cursor-pointer"
            >
              <span>{t('cart_proceed', 'متابعة إتمام الطلب')}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
