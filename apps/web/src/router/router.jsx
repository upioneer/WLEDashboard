import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout.jsx'
import { Dashboard } from '../views/Dashboard/Dashboard.jsx'
import { Settings } from '../views/Settings/Settings.jsx'
import { DeviceManager } from '../views/DeviceManager/DeviceManager.jsx'
import { Groups } from '../views/Groups/Groups.jsx'
import { Automation } from '../views/Automation/Automation.jsx'

function PlaceholderView({ title }) {
  return (
    <main style={{ padding: '2rem 3rem' }}>
      <h1 style={{ font: 'var(--type-h1)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
        {title}
      </h1>
      <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>
        This view is coming in a future phase.
      </p>
    </main>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true,           element: <Dashboard /> },
      { path: 'spatial',       element: <PlaceholderView title="Spatial View" /> },
      { path: 'groups',        element: <Groups /> },
      { path: 'automation',    element: <Automation /> },
      { path: 'studio',        element: <PlaceholderView title="Studio" /> },
      { path: 'settings',      element: <Settings /> },
      { path: 'devices',       element: <DeviceManager /> },
    ],
  },
])
