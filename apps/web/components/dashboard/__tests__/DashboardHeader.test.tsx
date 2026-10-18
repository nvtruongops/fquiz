import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DashboardHeader } from '../DashboardHeader'

describe('DashboardHeader', () => {
  it('offers Explore as the primary action when there is no active session', () => {
    const html = renderToStaticMarkup(
      <DashboardHeader
        user={{ name: 'Ari' }}
        isRefetching={false}
        onRefetch={() => undefined}
        showExploreAction
      />
    )

    expect(html).toContain('<h1')
    expect(html).toContain('Dashboard')
    expect(html).toContain('Welcome back, Ari')
    expect(html).toContain('href="/explore"')
  })

  it('leaves the primary action to the resume card when a session is active', () => {
    const html = renderToStaticMarkup(
      <DashboardHeader
        user={{ name: 'Ari' }}
        isRefetching={false}
        onRefetch={() => undefined}
        showExploreAction={false}
      />
    )

    expect(html).toContain('Dashboard')
    expect(html).not.toContain('href="/explore"')
  })
})
