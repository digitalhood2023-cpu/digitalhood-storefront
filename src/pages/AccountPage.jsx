import { useState } from "react";
import "./AccountPage.css";

const WORDPRESS_SITE_URL = "https://digitalhood.info";

const socialProviders = [
  {
    id: "google",
    label: "Continue with Google",
    shortLabel: "Google",
    icon: "G",
  },
  {
    id: "facebook",
    label: "Continue with Facebook",
    shortLabel: "Facebook",
    icon: "f",
  },
  {
    id: "twitter",
    label: "Continue with X",
    shortLabel: "X",
    icon: "𝕏",
  },
];

function getWordPressLoginUrl() {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/account`
      : "https://store.digitalhood.info/account";

  return `${WORDPRESS_SITE_URL}/my-account/?redirect_to=${encodeURIComponent(
    redirectTo
  )}`;
}

function getSocialLoginUrl(provider) {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/account`
      : "https://store.digitalhood.info/account";

  /*
    Nextend Social Login setup note:

    In WordPress Admin:
    Settings > Nextend Social Login > Provider > Usage

    Each provider gives an exact login URL or shortcode.
    Once configured, replace this fallback URL with the exact provider URL
    shown by Nextend for Google, Facebook, and X.

    For now, this sends customers to the WooCommerce My Account page,
    where Nextend can display the social buttons.
  */

  return `${WORDPRESS_SITE_URL}/my-account/?dh_social_provider=${provider}&redirect_to=${encodeURIComponent(
    redirectTo
  )}`;
}

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [isDemoSignedIn, setIsDemoSignedIn] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  function handleLoginSubmit(event) {
    event.preventDefault();

    /*
      Temporary frontend-only demo.

      Next backend step:
      POST to DigitalHood auth API or WooCommerce JWT endpoint,
      store token/customer in Zustand, then hydrate orders and addresses.
    */
    setIsDemoSignedIn(true);
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();

    /*
      Temporary frontend-only demo.

      Next backend step:
      Create customer in WooCommerce or DigitalHood customer API,
      then log the customer in automatically.
    */
    setIsDemoSignedIn(true);
  }

  function handleLogout() {
    setIsDemoSignedIn(false);

    setLoginForm({
      email: "",
      password: "",
    });

    setRegisterForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    });

    setActiveTab("login");
  }

  if (isDemoSignedIn) {
    return (
      <main className="account-page">
        <section className="account-hero">
          <div>
            <p className="account-eyebrow">My Account</p>
            <h1>Welcome back</h1>
            <p>
              Manage your DigitalHood orders, saved addresses, profile details,
              support requests, and marketplace activity from one place.
            </p>
          </div>

          <button className="account-secondary-button" onClick={handleLogout}>
            Sign out
          </button>
        </section>

        <section className="account-dashboard">
          <div className="account-profile-card">
            <div className="account-avatar">
              {(registerForm.firstName || loginForm.email || "D")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <h2>
                {registerForm.firstName
                  ? `${registerForm.firstName} ${registerForm.lastName}`
                  : "DigitalHood Customer"}
              </h2>
              <p>
                {registerForm.email ||
                  loginForm.email ||
                  "customer@digitalhood.info"}
              </p>
              <span>Customer account</span>
            </div>
          </div>

          <div className="account-stats-grid">
            <div className="account-stat-card">
              <strong>0</strong>
              <span>Orders</span>
            </div>

            <div className="account-stat-card">
              <strong>0</strong>
              <span>Saved items</span>
            </div>

            <div className="account-stat-card">
              <strong>0</strong>
              <span>Addresses</span>
            </div>
          </div>

          <div className="account-grid">
            <AccountDashboardCard
              title="Orders"
              description="Track your purchases, payment status, delivery progress, and order history."
              action="View orders"
            />

            <AccountDashboardCard
              title="Profile"
              description="Update your name, email address, phone number, and password."
              action="Edit profile"
            />

            <AccountDashboardCard
              title="Addresses"
              description="Save home, office, and pickup delivery addresses for faster checkout."
              action="Manage addresses"
            />

            <AccountDashboardCard
              title="Wishlist"
              description="Save products you like and come back to them later."
              action="View wishlist"
            />

            <AccountDashboardCard
              title="Payments"
              description="Review card, mobile money, and cash on delivery payment preferences."
              action="Payment settings"
            />

            <AccountDashboardCard
              title="Support"
              description="Get help with orders, refunds, delivery, and marketplace questions."
              action="Contact support"
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <section className="account-auth-layout">
        <div className="account-auth-intro">
          <p className="account-eyebrow">DigitalHood Account</p>
          <h1>Shop faster with your customer account.</h1>
          <p>
            Sign in to track orders, save delivery addresses, manage your
            profile, and enjoy faster checkout across DigitalHood Marketplace.
          </p>

          <div className="account-benefits">
            <div>
              <strong>Order tracking</strong>
              <span>See payment, processing, and delivery progress.</span>
            </div>

            <div>
              <strong>Saved addresses</strong>
              <span>Checkout faster next time with reusable delivery details.</span>
            </div>

            <div>
              <strong>Social login ready</strong>
              <span>
                Prepared for Google, Facebook, and X sign-in through WordPress.
              </span>
            </div>
          </div>
        </div>

        <div className="account-auth-card">
          <div className="account-tabs">
            <button
              className={activeTab === "login" ? "active" : ""}
              onClick={() => setActiveTab("login")}
              type="button"
            >
              Sign in
            </button>

            <button
              className={activeTab === "register" ? "active" : ""}
              onClick={() => setActiveTab("register")}
              type="button"
            >
              Create account
            </button>
          </div>

          <div className="account-social-login">
            {socialProviders.map((provider) => (
              <a
                key={provider.id}
                className={`account-social-button ${provider.id}`}
                href={getSocialLoginUrl(provider.id)}
              >
                <span>{provider.icon}</span>
                {provider.label}
              </a>
            ))}
          </div>

          <div className="account-divider">
            <span>or continue with email</span>
          </div>

          {activeTab === "login" ? (
            <form className="account-form" onSubmit={handleLoginSubmit}>
              <div>
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="account-form-row">
                <label className="account-checkbox">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>

                <a className="account-link-button" href={getWordPressLoginUrl()}>
                  Forgot password?
                </a>
              </div>

              <button className="account-primary-button" type="submit">
                Sign in
              </button>

              <p className="account-form-note">
                Demo mode for now. Email sign-in opens the local account
                dashboard until the real customer auth API is connected.
              </p>
            </form>
          ) : (
            <form className="account-form" onSubmit={handleRegisterSubmit}>
              <div className="account-two-column">
                <div>
                  <label htmlFor="register-first-name">First name</label>
                  <input
                    id="register-first-name"
                    type="text"
                    placeholder="First name"
                    value={registerForm.firstName}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label htmlFor="register-last-name">Last name</label>
                  <input
                    id="register-last-name"
                    type="text"
                    placeholder="Last name"
                    value={registerForm.lastName}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-email">Email address</label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="register-phone">Phone number</label>
                <input
                  id="register-phone"
                  type="tel"
                  placeholder="+260 97 000 0000"
                  value={registerForm.phone}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  placeholder="Create a password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <button className="account-primary-button" type="submit">
                Create account
              </button>

              <p className="account-form-note">
                Account creation will later connect to WooCommerce customers or
                a dedicated DigitalHood customer API.
              </p>
            </form>
          )}

          <div className="account-wordpress-link">
            <span>Already use your WordPress customer account?</span>
            <a href={getWordPressLoginUrl()}>Open WooCommerce account</a>
          </div>
        </div>
      </section>
    </main>
  );
}

function AccountDashboardCard({ title, description, action }) {
  return (
    <article className="account-dashboard-card">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <button type="button">{action}</button>
    </article>
  );
}
