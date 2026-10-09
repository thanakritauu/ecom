import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { AuthProvider } from "~/lib/auth";
import { CartProvider } from "~/lib/cart";
import { WishlistProvider } from "~/lib/wishlist";
import { ProductCatalogProvider } from "~/lib/productCatalog";
import { LandingPagesProvider } from "~/lib/promotionPages";
import { HomepageContentProvider } from "~/lib/homepageContent";
import { CollectionContentProvider } from "~/lib/collectionContent";
import { CategoryContentProvider } from "~/lib/categoryContent";
import { NavigationContentProvider } from "~/lib/navigationContent";
import { ToastViewport } from "~/lib/toast";
import { StorefrontPromotionsProvider } from "~/lib/storefrontPromotions";
import { PromoPopup } from "~/components/home/PromoPopup";
import { CookieConsent } from "~/components/shared/CookieConsent";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ProductCatalogProvider>
                <StorefrontPromotionsProvider>
                  <LandingPagesProvider>
                    <CategoryContentProvider>
                      <CollectionContentProvider>
                        <NavigationContentProvider>
                          <HomepageContentProvider>
                            <Suspense>{props.children}</Suspense>
                            {/* Global, mounted once here (not per-route) — a toast pushed from any
                                page (Checkout, Account, a Product Card's wishlist error, ...) must
                                render regardless of which route triggered it. */}
                            <ToastViewport />
                            {/* Site-wide: opens on whichever storefront pages Admin picked (never on /admin). */}
                            <PromoPopup />
                            <CookieConsent />
                          </HomepageContentProvider>
                        </NavigationContentProvider>
                      </CollectionContentProvider>
                    </CategoryContentProvider>
                  </LandingPagesProvider>
                </StorefrontPromotionsProvider>
              </ProductCatalogProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
