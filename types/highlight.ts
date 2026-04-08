import { Types } from 'mongoose'

export interface IUserHighlight {
  _id: Types.ObjectId
  student_id: Types.ObjectId
  question_id: Types.ObjectId
  text_segment: string
  color_code: '#B0D4B8' | '#D7F9FA' | '#FFE082' | '#EF9A9A'
  offset: number
  created_at: Date
}
