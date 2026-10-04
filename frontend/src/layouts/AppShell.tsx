import { Ellipsis, LogOut } from "lucide-react";
import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth, useCurrentUser } from "../auth/useAuth";
import { BrandMark } from "../components/BrandMark";
import { PageLoader } from "../components/StatusScreen";
import { cn } from "../utils/cn";
import styles from "./AppShell.module.css";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./navigation";

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} className={({ isActive }) => cn(styles.sideLink, isActive && styles.sideLinkActive)}>
      <Icon size={20} aria-hidden />
      <span>{item.label}</span>
    </NavLink>
  );
}

function TabLink({ item, forceActive }: { item: NavItem; forceActive?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => cn(styles.tab, (isActive || forceActive) && styles.tabActive)}
      aria-current={forceActive ? "page" : undefined}
    >
      <Icon size={22} aria-hidden />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const inMoreSection = pathname === "/more" || SECONDARY_NAV.some((item) => pathname.startsWith(item.to));

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <BrandMark />
        </div>
        <nav aria-label="Main" className={styles.sideNav}>
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
          <hr className={styles.divider} />
          {SECONDARY_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className={styles.avatar} aria-hidden>
              {user.first_name.charAt(0).toUpperCase()}
            </span>
            <div className={styles.userText}>
              <span className={styles.userName}>{user.first_name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          </div>
          <button type="button" className={styles.logout} onClick={() => void logout()} aria-label="Log out">
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </aside>

      <main id="main" className={styles.main}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <nav aria-label="Main" className={styles.bottomNav}>
        {PRIMARY_NAV.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
        <TabLink item={{ to: "/more", label: "More", icon: Ellipsis }} forceActive={inMoreSection} />
      </nav>
    </div>
  );
}
