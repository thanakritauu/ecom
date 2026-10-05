import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { AuthProvider } from "~/lib/auth";
import { CartProvider } from "~/lib/cart";
import { WishlistProvider } from "~/lib/wishlist";
import { ProductCatalogProvider } from "~/lib/productCatalog";
import { LandingPagesProvider } from "~/lib/promotionPages";
import { HomepageContentProvider } from "~/lib/homepageContent";
import { CampaignContentProvider } from "~/lib/campaignContent";
import { CollectionContentProvider } from "~/lib/collectionContent";
import { CategoryContentProvider } from "~/lib/categoryContent";
import { BrandContentProvider } from "~/lib/brandContent";
import { NavigationContentProvider } from "~/lib/navigationContent";
import { ToastViewport } from "~/lib/toast";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ProductCatalogProvider>
                <LandingPagesProvider>
                  <CategoryContentProvider>
                    <BrandContentProvider>
                      <CampaignContentProvider>
                        <CollectionContentProvider>
                          <NavigationContentProvider>
                            <HomepageContentProvider>
                              <Suspense>{props.children}</Suspense>
                              {/* Global, mounted once here (not per-route) — a toast pushed from any
                                  page (Checkout, Account, a Product Card's wishlist error, ...) must
                                  render regardless of which route triggered it. */}
                              <ToastViewport />
                            </HomepageContentProvider>
                          </NavigationContentProvider>
                        </CollectionContentProvider>
                      </CampaignContentProvider>
                    </BrandContentProvider>
                  </CategoryContentProvider>
                </LandingPagesProvider>
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
