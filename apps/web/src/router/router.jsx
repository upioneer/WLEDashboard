import { createBrowserRouter, useRouteError } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout.jsx'
import { Dashboard } from '../views/Dashboard/Dashboard.jsx'
import { Settings } from '../views/Settings/Settings.jsx'
import { DeviceManager } from '../views/DeviceManager/DeviceManager.jsx'
import { Groups } from '../views/Groups/Groups.jsx'
import { Automation } from '../views/Automation/Automation.jsx'
import { SpatialView } from '../views/SpatialView/SpatialView.jsx'
import StudioView from '../views/Studio/StudioView.jsx'

function RouteErrorBoundary() {
  const error = useRouteError();
  return (
    <div style={{ padding: '2rem 3rem', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ color: '#ef4444', marginBottom: '1rem', font: 'var(--type-h2)' }}>Oops! Something went wrong.</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>The application encountered an unexpected error in this view.</p>
      <pre style={{ background: '#1a1d29', padding: '1rem', borderRadius: '8px', maxWidth: '800px', overflowX: 'auto', color: '#f87171', border: '1px solid #2d3348', fontSize: '0.85rem' }}>
        {error?.message || error?.statusText || 'Unknown error'}
      </pre>
      <button 
        onClick={() => window.location.reload()}
        style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
      >
        Reload Page
      </button>
    </div>
  )
}

const childRoutes = [
  { index: true,           element: <Dashboard /> },
  { path: 'spatial',       element: <SpatialView /> },
  { path: 'groups',        element: <Groups /> },
  { path: 'automation',    element: <Automation /> },
  { path: 'studio',        element: <StudioView /> },
  { path: 'settings',      element: <Settings /> },
  { path: 'devices',       element: <DeviceManager /> },
].map(route => ({ ...route, errorElement: <RouteErrorBoundary /> }))

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: childRoutes,
  },
])
