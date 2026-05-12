import { Types } from 'mongoose'

export interface ISiteSettings {
  _id: Types.ObjectId
  app_name: string
  app_description: string
  allow_registration: boolean
  maintenance_mode: boolean
  anti_sharing_enabled: boolean
  anti_sharing_max_violations: number
}
