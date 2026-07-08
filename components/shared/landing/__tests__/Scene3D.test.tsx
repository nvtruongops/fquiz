/**
 * @jest-environment node
 */

jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => children,
  useFrame: () => {},
}))
jest.mock('@react-three/drei', () => ({
  Points: () => null,
  PointMaterial: () => null,
  Float: ({ children }: any) => children,
  Sphere: () => null,
  MeshDistortMaterial: () => null,
}))

import { default as Scene3D } from '../Scene3D'

describe('Scene3D', () => {
  it('should be defined as a component', () => {
    expect(Scene3D).toBeDefined()
    expect(typeof Scene3D).toBe('function')
  })
})
