import { z } from 'zod'

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Vui lòng nhập email hoặc tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(20, 'Tên đăng nhập tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(50, 'Mật khẩu quá dài'),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
