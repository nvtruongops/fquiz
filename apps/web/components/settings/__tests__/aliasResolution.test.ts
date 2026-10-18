it('resolves a colliding settings alias within the web app', () => {
  expect(require.resolve('@/components/settings/GeneralSettingsCard'))
    .toBe(require.resolve('../GeneralSettingsCard'))
})
