# Requirements Document

## Introduction

Hệ thống Quiz Trực Tuyến là một nền tảng web cho phép Admin tạo và quản lý bộ câu hỏi theo danh mục và mã môn học, đồng thời cho phép sinh viên/học sinh đăng ký, đăng nhập và làm bài kiểm tra trực tuyến. Hệ thống hỗ trợ hai chế độ làm quiz: hiện đáp án ngay sau mỗi câu hoặc hiện đáp án sau khi hoàn thành toàn bộ bài. Frontend và Backend được triển khai trên Vercel, sử dụng MongoDB Atlas làm cơ sở dữ liệu.

## Tech Stack Decisions

- **Framework**: Next.js App Router, triển khai trên Vercel (Frontend + Backend Serverless Functions trong cùng một project)
- **Validation**: Zod được dùng làm schema validation dùng chung cho cả Frontend (form validation) và Backend (API input validation)
- **Database Connection**: Mongoose với Singleton Pattern để tránh tạo quá nhiều connection trong môi trường Serverless
- **Security Headers**: Cấu hình trong `next.config.js` bao gồm `Content-Security-Policy` với `img-src` directive liên kết với domain whitelist của Requirement 14
- **Design Palette (CoolorsPalette)**:
  - `#5D7B6F` (Deep Sage Green): Dùng cho các interactive elements nổi bật (buttons), headers, và text highlight thông tin quan trọng.
  - `#A4C3A2` (Mint Sage Green): Dùng cho success alerts và các interactive elements ít nổi bật hơn.
  - `#B0D4B8` (Light Sage Green): Dùng cho background highlight colors, active question markers, và secondary backgrounds.
  - `#EAE7D6` (Cream White): Dùng cho primary application backgrounds và light background components.
  - `#D7F9FA` (Very Light Cyan): Dùng cho informational alerts, special highlight colors (ví dụ: đánh dấu "bẫy"), và very subtle backgrounds.

## Glossary

- **System**: Hệ thống Quiz Trực Tuyến tổng thể
- **Auth_Service**: Dịch vụ xác thực người dùng (đăng ký, đăng nhập, quản lý phiên)
- **Quiz_Manager**: Module quản lý bộ câu hỏi và quiz dành cho Admin
- **Quiz_Engine**: Module xử lý logic làm bài quiz của sinh viên
- **Search_Service**: Dịch vụ tìm kiếm quiz theo danh mục hoặc mã môn học
- **Result_Service**: Dịch vụ tính toán và lưu trữ kết quả bài làm
- **Admin**: Người dùng có quyền quản trị, tạo và quản lý câu hỏi/quiz
- **Student**: Sinh viên/học sinh đã đăng ký tài khoản và có thể làm quiz
- **Quiz**: Một bộ câu hỏi thuộc một danh mục và mã môn học cụ thể
- **Question**: Một câu hỏi trắc nghiệm gồm nội dung, các lựa chọn và đáp án đúng
- **Category**: Danh mục phân loại quiz (ví dụ: Toán, Lý, Hóa, CNTT)
- **Course_Code**: Mã môn học dùng để định danh và tìm kiếm quiz
- **Quiz_Session**: Một phiên làm bài quiz của sinh viên
- **Immediate_Mode**: Chế độ làm quiz hiện đáp án ngay sau mỗi câu trả lời
- **Review_Mode**: Chế độ làm quiz hiện đáp án sau khi hoàn thành toàn bộ bài
- **JWT**: JSON Web Token dùng để xác thực và phân quyền người dùng
- **CORS Policy**: Chính sách chia sẻ tài nguyên giữa các domain, ngăn chặn request từ các nguồn không được phép
- **Projection**: Kỹ thuật lọc bớt các trường dữ liệu nhạy cảm (như đáp án đúng) trước khi gửi response về Frontend
- **Stateless Persistence**: Việc lưu trữ trạng thái phiên làm bài vào Database vì môi trường Serverless không duy trì bộ nhớ đệm giữa các request
- **Bcrypt**: Thuật toán băm mật khẩu (hashing) kèm theo muối (salt) để bảo vệ mật khẩu người dùng
- **Zod**: Thư viện TypeScript-first schema validation, dùng chung cho cả Frontend (form validation) và Backend (API input validation) trong Next.js
- **Singleton Pattern**: Mô hình thiết kế đảm bảo chỉ có một instance kết nối database được tạo ra trong suốt vòng đời của ứng dụng, tránh connection pool exhaustion trong môi trường Serverless
- **Content-Security-Policy (CSP)**: HTTP response header kiểm soát các nguồn tài nguyên (script, image, font) mà trình duyệt được phép tải, được cấu hình trong `next.config.js`
- **Result Integrity**: Nguyên tắc đảm bảo điểm số được tính toán hoàn toàn ở Backend dựa trên dữ liệu trong database, không tin tưởng bất kỳ giá trị điểm nào từ Client.
- **Race Condition**: Tình huống hai request đồng thời tác động lên cùng một tài nguyên (Quiz_Session) dẫn đến trạng thái không nhất quán.
- **CoolorsPalette**: Bộ mã màu hexadecimal được dùng làm hướng dẫn thiết kế cho giao diện hệ thống, hướng tới phong cách chuyên nghiệp, nhẹ nhàng và tập trung. Bao gồm: #5D7B6F (Deep Sage Green), #A4C3A2 (Mint Sage Green), #B0D4B8 (Light Sage Green), #EAE7D6 (Cream White), #D7F9FA (Very Light Cyan).
- **Question Map**: Lưới điều hướng và trạng thái trong một Quiz Session, hiển thị tất cả câu hỏi cùng trạng thái hoàn thành (đã trả lời, chưa trả lời) và cho phép Student nhảy trực tiếp đến bất kỳ câu hỏi nào.

---

## Requirements

### Requirement 1: Đăng ký tài khoản sinh viên

**User Story:** As a Student, I want to register an account, so that I can access the quiz platform and take quizzes.

#### Acceptance Criteria

1. THE Auth_Service SHALL provide a registration endpoint accepting full name, email, password, and student ID.
2. WHEN a Student submits a registration form with a valid email and password of at least 8 characters, THE Auth_Service SHALL create a new Student account and return a success response.
3. WHEN a Student submits a registration form with an email that already exists in the database, THE Auth_Service SHALL return an error message indicating the email is already registered.
4. WHEN a Student submits a registration form with a password shorter than 8 characters, THE Auth_Service SHALL return a validation error specifying the minimum password length requirement.
5. IF the database is unavailable during registration, THEN THE Auth_Service SHALL return an HTTP 503 error response.

---

### Requirement 2: Đăng nhập và xác thực

**User Story:** As a Student or Admin, I want to log in with my credentials, so that I can access features appropriate to my role.

#### Acceptance Criteria

1. WHEN a user submits valid credentials (email and password), THE Auth_Service SHALL return a JWT token with the user's role (Student or Admin) and an expiry of 24 hours.
2. WHEN a user submits an incorrect email or password, THE Auth_Service SHALL return an HTTP 401 error response without revealing which field is incorrect.
3. WHILE a user holds a valid JWT token, THE System SHALL grant access to role-appropriate endpoints without requiring re-authentication.
4. WHEN a JWT token expires, THE System SHALL reject the request and return an HTTP 401 error response.
5. IF a user submits a login request with a missing email or password field, THEN THE Auth_Service SHALL return an HTTP 400 error response with a descriptive validation message.

---

### Requirement 3: Quản lý danh mục (Admin)

**User Story:** As an Admin, I want to create and manage quiz categories, so that quizzes can be organized and easily found by students.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL provide endpoints for creating, reading, updating, and deleting Categories.
2. WHEN an Admin creates a Category with a unique name, THE Quiz_Manager SHALL persist the Category and return the created Category object.
3. WHEN an Admin attempts to create a Category with a name that already exists, THE Quiz_Manager SHALL return an HTTP 409 error response.
4. WHEN an Admin deletes a Category that has associated Quizzes, THE Quiz_Manager SHALL return an HTTP 400 error response indicating the Category is in use.
5. WHILE a request is made without a valid Admin JWT token, THE Quiz_Manager SHALL reject the request with an HTTP 403 error response.

---

### Requirement 4: Tạo và quản lý Quiz (Admin)

**User Story:** As an Admin, I want to create and manage quizzes with questions, so that students have content to study and test their knowledge.

#### Acceptance Criteria

1. WHEN an Admin creates a Quiz, THE Quiz_Manager SHALL require a title, Category, Course_Code, and at least one Question.
2. THE Quiz_Manager SHALL persist each Question with a question text, a list of 2 to 6 answer options, and exactly one correct answer index.
3. WHEN an Admin updates a Quiz, THE Quiz_Manager SHALL replace the existing Quiz data and return the updated Quiz object.
4. WHEN an Admin deletes a Quiz, THE Quiz_Manager SHALL remove the Quiz and all associated Questions from the database.
5. WHEN an Admin requests a list of all Quizzes, THE Quiz_Manager SHALL return a paginated list with a default page size of 20 items.
6. WHILE a request is made without a valid Admin JWT token, THE Quiz_Manager SHALL reject the request with an HTTP 403 error response.

---

### Requirement 5: Tìm kiếm Quiz (Student)

**User Story:** As a Student, I want to search for quizzes by category or course code, so that I can find relevant quizzes to practice.

#### Acceptance Criteria

1. WHEN a Student provides a Category name as a search parameter, THE Search_Service SHALL return all Quizzes belonging to that Category.
2. WHEN a Student provides a Course_Code as a search parameter, THE Search_Service SHALL return all Quizzes matching that Course_Code.
3. WHEN a Student provides both a Category name and a Course_Code, THE Search_Service SHALL return Quizzes matching both criteria.
4. WHEN a search query returns no results, THE Search_Service SHALL return an empty list with an HTTP 200 response.
5. THE Search_Service SHALL support case-insensitive matching for Category name and Course_Code search parameters.
6. THE Search_Service SHALL return search results in a paginated format with a default page size of 20 items.

---

### Requirement 6: Bắt đầu phiên làm Quiz

**User Story:** As a Student, I want to start a quiz session and choose a quiz mode, so that I can take the quiz in the way that suits my learning style.

#### Acceptance Criteria

1. WHEN a Student selects a Quiz and a mode (Immediate_Mode or Review_Mode), THE Quiz_Engine SHALL create a new Quiz_Session and return the first Question without revealing the correct answer.
2. THE Quiz_Engine SHALL record the selected mode (Immediate_Mode or Review_Mode) in the Quiz_Session at creation time.
3. WHEN a Quiz_Session is created, THE Quiz_Engine SHALL assign a unique session ID and record the start timestamp.
4. WHILE a Quiz_Session is active, THE Quiz_Engine SHALL serve Questions in a consistent order for that session.
5. WHILE a request is made without a valid Student JWT token, THE Quiz_Engine SHALL reject the request with an HTTP 401 error response.

---

### Requirement 7: Trả lời câu hỏi - Chế độ Immediate_Mode

**User Story:** As a Student in Immediate Mode, I want to see the correct answer immediately after submitting my answer, so that I can learn from each question as I go.

#### Acceptance Criteria

1. WHEN a Student in Immediate_Mode submits an answer for a Question, THE Quiz_Engine SHALL return whether the submitted answer is correct, the correct answer index, and an explanation if available.
2. WHEN a Student in Immediate_Mode submits a correct answer, THE Quiz_Engine SHALL increment the session score by 1 point.
3. WHEN a Student in Immediate_Mode submits an answer, THE Quiz_Engine SHALL record the submitted answer and correctness in the Quiz_Session.
4. WHEN a Student in Immediate_Mode submits an answer for the last Question, THE Quiz_Engine SHALL mark the Quiz_Session as completed and return the final score.
5. THE Quiz_Engine SHALL calculate the session score exclusively on the Backend by reading `user_answers` stored in the Quiz_Session document in MongoDB; the Frontend SHALL NOT submit a score value.

---

### Requirement 8: Trả lời câu hỏi - Chế độ Review_Mode

**User Story:** As a Student in Review Mode, I want to answer all questions before seeing any results, so that I can simulate a real exam experience.

#### Acceptance Criteria

1. WHEN a Student in Review_Mode submits an answer for a Question that is not the last, THE Quiz_Engine SHALL record the answer and return only the next Question without revealing correctness.
2. WHEN a Student in Review_Mode submits an answer for the last Question, THE Quiz_Engine SHALL calculate the total score, mark the Quiz_Session as completed, and return the full result including each question, the submitted answer, the correct answer, and the total score.
3. WHILE a Quiz_Session in Review_Mode is active, THE Quiz_Engine SHALL not return any correct answer information until the session is completed.
4. WHEN the last answer is submitted in Review_Mode, THE Quiz_Engine SHALL compute the total score server-side by comparing each entry in `user_answers` against the `correct_answer` stored in the database, without accepting any score value from the client request.

---

### Requirement 9: Xem kết quả và lịch sử làm bài

**User Story:** As a Student, I want to view my quiz results and history, so that I can track my progress over time.

#### Acceptance Criteria

1. WHEN a Quiz_Session is completed, THE Result_Service SHALL persist the session result including Quiz ID, Student ID, score, total questions, mode, and completion timestamp.
2. WHEN a Student requests their quiz history, THE Result_Service SHALL return a paginated list of completed Quiz_Sessions for that Student, ordered by completion timestamp descending.
3. WHEN a Student requests the detail of a specific completed Quiz_Session, THE Result_Service SHALL return each Question, the Student's submitted answer, the correct answer, and the final score.
4. WHILE a request is made without a valid Student JWT token, THE Result_Service SHALL reject the request with an HTTP 401 error response.

---

### Requirement 10: Triển khai và vận hành hệ thống

**User Story:** As a Developer, I want the system deployed on Vercel with MongoDB Atlas, so that the platform is accessible online with a managed database.

#### Acceptance Criteria

1. THE System SHALL expose the Backend API as Vercel Serverless Functions compatible with the Vercel deployment model.
2. THE System SHALL connect to a MongoDB Atlas cluster using a connection string provided via environment variables.
3. IF the MongoDB Atlas connection fails on startup, THEN THE System SHALL return an HTTP 503 error response for all API requests until the connection is restored.
4. THE System SHALL serve the Frontend as a static site or Next.js application deployable to Vercel.
5. THE System SHALL store all secrets (JWT secret, MongoDB URI) exclusively in environment variables and never in source code.
6. THE System SHALL implement the Mongoose database connection using the Singleton Pattern, reusing an existing connection across Serverless Function invocations within the same runtime instance instead of creating a new connection per request.
7. WHEN a Serverless Function invocation detects an existing Mongoose connection in the cached module scope, THE System SHALL reuse that connection without calling `mongoose.connect()` again.
8. THE System SHALL define all API input validation rules using Zod schemas shared between the Frontend and Backend, covering at minimum: email format (RFC 5322 regex), password minimum length of 8 characters, and required field presence.
9. WHEN a request payload fails Zod schema validation on the Backend, THE System SHALL return an HTTP 400 error response with a structured error message listing each invalid field and the corresponding validation rule violated.
10. THE System SHALL configure HTTP security headers in `next.config.js` including a `Content-Security-Policy` header with an `img-src` directive that restricts image sources to the same domain whitelist defined in Requirement 14.
11. WHEN the Next.js application serves any page response, THE System SHALL include the configured `Content-Security-Policy` header in the HTTP response.
12. THE System's User Interface SHALL utilize a professional, modern, and accessible color palette, avoiding extremely high-contrast combinations. The specific color hexadecimal codes and implementation details SHALL be defined in the UI/UX Design document.

---

### Requirement 11: Bảo mật và Lưu trữ mật khẩu (Auth_Service)

**User Story:** As a System Administrator, I want user passwords to be securely hashed, so that user credentials are protected if the database is compromised.

#### Acceptance Criteria

1. THE Auth_Service SHALL hash all passwords using the Bcrypt algorithm with a minimum of 10 salt rounds before persisting to the database.
2. WHEN a Student submits a registration request, THE Auth_Service SHALL apply Bcrypt hashing to the password before storing the Student record.
3. WHEN a user submits a login request, THE Auth_Service SHALL compare the submitted password against the stored Bcrypt hash without decrypting the hash.
4. THE Auth_Service SHALL enforce rate limiting of a maximum of 5 failed login attempts per minute per IP address to prevent brute-force attacks.
5. IF a plain-text password is detected in the database, THEN THE Auth_Service SHALL reject the record and return an HTTP 500 error response.

---

### Requirement 12: Phân tách dữ liệu nhạy cảm (Quiz_Engine)

**User Story:** As a Student, I want the correct answers to be hidden from the browser's Network tab before I submit my answer, so that the quiz results reflect my actual knowledge.

#### Acceptance Criteria

1. WHEN THE Quiz_Engine returns a list of Questions to the Frontend, THE Quiz_Engine SHALL apply Projection to exclude the `correct_answer` and `explanation` fields from the response payload.
2. WHEN a Quiz_Session is in Review_Mode and is marked as completed, THE Quiz_Engine SHALL include the `correct_answer` and `explanation` fields in the result response.
3. WHILE a Quiz_Session is active and not yet completed, THE Quiz_Engine SHALL not include `correct_answer` or `explanation` in any response for that session.
4. IF a Student sends a request to retrieve answers for a Quiz_Session that is not completed, THEN THE Quiz_Engine SHALL return an HTTP 403 Forbidden error response.

---

### Requirement 13: Xử lý State trong Serverless (Quiz_Session)

**User Story:** As a Student, I want to reload the page without losing my current quiz progress, so that a browser refresh does not disrupt my session.

#### Acceptance Criteria

1. WHEN a Student selects an answer for a Question, THE Quiz_Engine SHALL immediately persist the answer to the `user_answers` field of the corresponding Quiz_Session document in MongoDB.
2. THE Quiz_Session SHALL store a `current_question_index` field that is updated each time the Student advances to the next Question.
3. WHEN a Student resumes an active Quiz_Session, THE Quiz_Engine SHALL return the Question at the stored `current_question_index` along with all previously submitted answers.
4. THE Quiz_Session SHALL include an `expires_at` field configured as a MongoDB TTL Index set to 24 hours from the session creation timestamp.
5. WHEN a Quiz_Session document reaches its `expires_at` timestamp without being completed, THE System SHALL automatically delete the Quiz_Session document from the database.
6. WHEN THE Quiz_Engine receives an answer submission request, THE Quiz_Engine SHALL first verify that the Quiz_Session status is not `completed` before persisting the answer; IF the session status is `completed`, THEN THE Quiz_Engine SHALL return an HTTP 409 Conflict error response and discard the submitted answer.

---

### Requirement 14: Quản lý Hình ảnh/Media cho Câu hỏi (Admin)

**User Story:** As an Admin, I want to add image URLs to questions, so that quizzes can include visual content for a better learning experience.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL support an optional `image_url` field in the Question object for storing an image URL.
2. WHEN an Admin submits a Question with an `image_url`, THE Quiz_Manager SHALL validate that the URL's domain is present in the configured domain whitelist before persisting the Question.
3. IF an Admin submits a Question with an `image_url` whose domain is not in the whitelist, THEN THE Quiz_Manager SHALL return an HTTP 400 error response with a message indicating the domain is not allowed.
4. WHERE direct file upload is enabled, THE Quiz_Manager SHALL integrate with an external media storage service (Cloudinary or AWS S3) and store only the returned URL in the Question object, not the binary file data.

---

### Requirement 15: Duyệt Quiz theo Mã môn học (Student)

**User Story:** As a Student, I want to click on a Course Code to see all available quizzes, so that I can easily choose a specific test to practice.

#### Acceptance Criteria

1. THE System SHALL provide an endpoint returning all unique Course_Code values available in the database.
2. WHEN a Student selects a Course_Code, THE Search_Service SHALL return a list of Quizzes associated with that Course_Code, including each Quiz's title, total question count, and the Student's personal best score for that Quiz if one exists.
3. WHEN a Student's best score does not exist for a Quiz, THE Search_Service SHALL return `null` for the best score field for that Quiz.
4. WHEN a Student selects a specific Quiz from the list, THE System SHALL require the Student to select a mode (Immediate_Mode or Review_Mode) before creating a new Quiz_Session.
5. THE Search_Service SHALL return the Course_Code listing in alphabetical order.

---

### Requirement 17: Tính khả dụng và Thiết kế giao diện (System-Wide)

**User Story:** As a Student or Admin, I want to use a professional and accessible interface, so that I can focus on learning or management.

#### Acceptance Criteria

1. THE System's User Interface SHALL use a professional and calming color scheme. While the specific codes are defined in the Design documentation, the palette SHALL primarily utilize sage greens, soft grays, and warm off-whites to promote focus and reduce eye strain, referencing the CoolorsPalette defined in the Tech Stack Decisions section.
2. THE UI SHALL provide a "Question Map" feature available in all quiz sessions, allowing Students to view a status grid of all questions (answered, unanswered) and navigate directly to any question by clicking on it.
3. IN Immediate_Mode, THE System SHALL clearly indicate correct and incorrect answers with distinct visual cues (green for correct, red for incorrect) alongside the correct answer explanation after each submission.
4. IN Review_Mode, THE final results view SHALL present a detailed breakdown for each question, including the question text, all answer options, the submitted answer, the correct answer, and the explanation.
