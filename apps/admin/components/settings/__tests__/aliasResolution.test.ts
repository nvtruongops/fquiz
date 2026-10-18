it('resolves a colliding settings alias within the admin app', () => {
  expect(require.resolve('@/components/settings/GeneralSettingsCard'))
    .toBe(require.resolve('../GeneralSettingsCard'))
})
