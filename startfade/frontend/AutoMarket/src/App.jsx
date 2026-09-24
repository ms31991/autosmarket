import './App.css'

import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { UserProfilePage } from './pages/user/UserProfile'
import { UserSettingsPage } from './pages/user/UserSettings'

import {
  Routes,
  Route,
  useLocation
} from 'react-router-dom'

import { Vehicles } from './pages/Vehicles'

import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'

import { Admin } from './pages/admin/Admin'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminCountries } from './pages/admin/AdminCountries'
import { AdminCities } from './pages/admin/AdminCities'
import { AdminBrands } from './pages/admin/AdminBrands'
import { AdminModels } from './pages/admin/AdminModels'
import { AdminCategories } from './pages/admin/AdminCategories'
import { AdminFeatures } from './pages/admin/AdminFeatures'
import { AdminFuelTypes } from './pages/admin/AdminFuelTypes'
import { AdminTransmissions } from './pages/admin/AdminTransmissions'
import { AdminBodyTypes } from './pages/admin/AdminBodyTypes'
import { AdminConditions } from './pages/admin/AdminConditions'
import { AdminColors } from './pages/admin/AdminColors'
import { AdminDriveTypes } from './pages/admin/AdminDriveTypes'
import { AdminRentalDetails } from './pages/admin/AdminRentalDetails'
import { AdminRentalBookings } from './pages/admin/AdminRentalBookings'
import { AdminReviews } from './pages/admin/AdminReviews'
import { AdminNotifications } from './pages/admin/AdminNotifications'
import { AdminPayments } from './pages/admin/AdminPayments'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminVehicles } from './pages/admin/AdminVehicles'
import { AdminListingTypes } from './pages/admin/AdminListingTypes'
import { AdminAdvertisements } from './pages/admin/AdminAdvertisements'
import { AdminCompanyBanners } from './pages/admin/AdminCompanyBanners'

import ProtectedRoute from './components/ProtectedRoute'

import { MessagesPage } from './pages/MessagesPage'
import { AddVehicle } from './pages/AddVehicle'
import { MyVehicles } from './pages/MyVehicles'
import { VehicleDetails } from './pages/VehicleDetails'
import { EditVehicle } from './pages/EditVehicle'
import { MyFavourites } from './pages/MyFavourites'
import { VehicleForSale } from './pages/VehicleForSale'
import { VehicleForRent } from './pages/VehicleForRent'

import { SelectVehicle } from './pages/advertisment/SelectVehicle'
import { AdvertiseCompanyBanner } from './pages/advertisment/AdvertiseCompanyBanner'
import { Payment } from './pages/advertisment/Payment'
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { LegalPage } from './pages/legal/LegalPage'
import { FaqPage } from './pages/FaqPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { GuidesPage } from './pages/GuidesPage'
import { AdminReports } from './pages/admin/AdminReports'
import { AdminSiteSettings } from './pages/admin/AdminSiteSettings'
import { useLanguage } from './i18n/LanguageContext'
import { SeoHead, organizationJsonLd } from './seo/SeoHead'
import { getRouteSeo } from './seo/routeSeo'
import { useSiteSettings } from './context/SiteSettingsContext'

function App() {
  const location = useLocation()
  const { t } = useLanguage()
  const site = useSiteSettings()

  const isAdminPage =
    location.pathname.startsWith('/admin')
  const hideFooter =
    isAdminPage ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register')
  const pageSeo = getRouteSeo(location.pathname, t)

  return (
    <div className="app-root">
      <a className="skip-link" href="#main-content">
        {t("skip")}
      </a>

      {!pageSeo.skip && (
        <SeoHead
          title={pageSeo.title}
          description={pageSeo.description}
          noindex={pageSeo.noindex}
          jsonLd={pageSeo.noindex ? null : organizationJsonLd(site)}
        />
      )}

      {!isAdminPage && <Navbar />}

      <div id="main-content">
      <Routes>

        {/* ===================================
            PUBLIC PAGES
        =================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route path="/privacy" element={<LegalPage page="privacy" />} />
        <Route path="/terms" element={<LegalPage page="terms" />} />
        <Route path="/cookies" element={<LegalPage page="cookies" />} />
        <Route path="/refunds" element={<LegalPage page="refunds" />} />
        <Route path="/about" element={<LegalPage page="about" />} />
        <Route path="/contact" element={<LegalPage page="contact" />} />
        <Route path="/guidelines" element={<LegalPage page="guidelines" />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuidesPage />} />

        <Route
          path="/sso-callback"
          element={<AuthenticateWithRedirectCallback />}
        />
        <Route
          path="/login/sso-callback"
          element={<AuthenticateWithRedirectCallback />}
        />
        <Route
          path="/register/sso-callback"
          element={<AuthenticateWithRedirectCallback />}
        />
        <Route path="/login/*" element={<Login />} />
        <Route path="/register/*" element={<Register />} />
        <Route
          path="/vehicles"
          element={<Vehicles />}
        />

        <Route
          path="/vehicles-for-sale"
          element={<VehicleForSale />}
        />

        <Route
          path="/vehicles-for-rent"
          element={<VehicleForRent />}
        />

        <Route
          path="/vehicles/:id"
          element={<VehicleDetails />}
        />

        {/* ===================================
            VEHICLES
        =================================== */}

        <Route
          path="/add-vehicle"
          element={
            <ProtectedRoute>
              <AddVehicle />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-vehicles"
          element={
            <ProtectedRoute>
              <MyVehicles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-vehicle/:id"
          element={
            <ProtectedRoute>
              <EditVehicle />
            </ProtectedRoute>
          }
        />


        {/* ===================================
            FAVOURITES
        =================================== */}

        <Route
          path="/favourites"
          element={
            <ProtectedRoute>
              <MyFavourites />
            </ProtectedRoute>
          }
        />


        {/* ===================================
            USER PROFILE
        =================================== */}

        <Route
          path="/userprofile"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/userprofile/:userId"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <UserSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/:section"
          element={
            <ProtectedRoute>
              <UserSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* ===================================
            MESSAGES
        =================================== */}

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages/:conversationId"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="/advertise/select-vehicle"
          element={
            <ProtectedRoute>
              <SelectVehicle />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advertise/company-banner"
          element={
            <ProtectedRoute>
              <AdvertiseCompanyBanner />
            </ProtectedRoute>
          }
        />

        {/* ===================================
            PAYMENT
        =================================== */}

        <Route
          path="/payment/:purchaseId"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />


        {/* ===================================
            ADMIN
        =================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="Admin">
              <Admin />
            </ProtectedRoute>
          }
        >

          {/* Dashboard */}

          <Route
            index
            element={<AdminDashboard />}
          />


          {/* Countries */}

          <Route
            path="countries"
            element={<AdminCountries />}
          />


          {/* Cities */}

          <Route
            path="cities"
            element={<AdminCities />}
          />


          {/* Brands */}

          <Route
            path="brands"
            element={<AdminBrands />}
          />


          {/* Models */}

          <Route
            path="models"
            element={<AdminModels />}
          />


          {/* Categories */}

          <Route
            path="categories"
            element={<AdminCategories />}
          />


          {/* Features */}

          <Route
            path="features"
            element={<AdminFeatures />}
          />


          {/* Fuel Types */}

          <Route
            path="fuel-types"
            element={<AdminFuelTypes />}
          />


          {/* Transmissions */}

          <Route
            path="transmissions"
            element={<AdminTransmissions />}
          />


          {/* Body Types */}

          <Route
            path="body-types"
            element={<AdminBodyTypes />}
          />


          {/* Conditions */}

          <Route
            path="conditions"
            element={<AdminConditions />}
          />


          {/* Colors */}

          <Route
            path="colors"
            element={<AdminColors />}
          />


          {/* Drive Types */}

          <Route
            path="drive-types"
            element={<AdminDriveTypes />}
          />


          {/* Rental Details */}

          <Route
            path="rental-details"
            element={<AdminRentalDetails />}
          />


          {/* Rental Bookings */}

          <Route
            path="rental-bookings"
            element={<AdminRentalBookings />}
          />


          {/* Reviews */}

          <Route
            path="reviews"
            element={<AdminReviews />}
          />


          {/* Notifications */}

          <Route
            path="notifications"
            element={<AdminNotifications />}
          />

          <Route
            path="reports"
            element={<AdminReports />}
          />

          <Route
            path="site-settings"
            element={<AdminSiteSettings />}
          />


          {/* Payments */}

          <Route
            path="payments"
            element={<AdminPayments />}
          />

          <Route
            path="users"
            element={<AdminUsers />}
          />

          <Route
            path="vehicles"
            element={<AdminVehicles />}
          />

          <Route
            path="listing-types"
            element={<AdminListingTypes />}
          />

          <Route
            path="advertisements"
            element={<AdminAdvertisements />}
          />

          <Route
            path="banners"
            element={<AdminCompanyBanners />}
          />

        </Route>

      </Routes>
      </div>

      {!hideFooter && <Footer />}
    </div>
  )
}

export default App