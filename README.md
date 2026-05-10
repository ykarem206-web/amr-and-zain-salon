# 💈 Amr & Zain Salon - Real-time Booking System

A fully responsive, full-stack web application designed to streamline the booking process for a barbershop. Built with a focus on real-time data synchronization, security, and user experience.

## 🔗 Live Demo
[اضغط هنا لتجربة الموقع الحي](https://amrandzainsalon.vercel.app/)

## ✨ Key Features

- **Real-time Dashboard:** Built with Firebase Firestore to display new bookings instantly without page reloads.
- **Dynamic Availability & Day-offs:** Admins can manually block specific dates for the entire salon or for individual barbers. The UI dynamically disables these time slots for users.
- **Spam Protection (Rate Limiting):** Implemented client-side security using `localStorage` to prevent spam bookings and limit users to one booking per day per device.
- **Secure Admin Panel:** Protected by Firebase Authentication. Only authorized personnel can manage bookings and modify schedules.
- **Instant Email Notifications:** Integrated with Web3Forms to send immediate alerts upon successful bookings.
- **Responsive UI:** Custom-designed interface using Tailwind CSS, optimized for both mobile and desktop experiences.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+).
- **Styling:** Tailwind CSS.
- **Backend as a Service (BaaS):** Firebase (Firestore Database, Authentication).
- **Integrations:** Web3Forms (Email Notifications).
- **Hosting:** Vercel.

## 🚀 How It Works (Security & Logic)
- **Firebase Security Rules:** Configured to allow public writing for new bookings but strictly restrict reading/deleting/modifying existing data to authenticated admins only.
- **State Management:** Time slots are dynamically calculated and rendered based on previous bookings fetched from Firestore, ensuring no double-booking occurs.

---
*This project was developed to showcase practical problem-solving, real-world business logic implementation, and secure data handling.*