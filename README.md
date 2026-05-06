# 💈 Amr & Zain Barber Salon - Booking System

A fully functional, Single Page Application (SPA) for a barber salon booking system. This project provides a seamless user experience for customers to book their appointments, while ensuring robust backend validation to prevent double bookings.

## 🚀 Live Demo
You can check out the live version of the application here: **[https://teal-bavarois-7655eb.netlify.app]**

## ✨ Features
- **Interactive UI (SPA):** Smooth navigation between sections without page reloads.
- **Smart Booking System:** Real-time checking to prevent double-booking (disables already booked time slots).
- **Automated Notifications:** Sends instantaneous email alerts to the salon management upon a successful booking.
- **Dynamic State Management:** Temporarily stores user selections (Barber, Date, Time) across different views.
- **Responsive Design:** Mobile-first approach, fully responsive and optimized for all screen sizes.

## 🛠️ Tech Stack
- **Frontend:** HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (v4)
- **Backend/Database:** Firebase Firestore (NoSQL)
- **Third-Party Services:** EmailJS (for automated emails)
- **Deployment:** Netlify

## ⚙️ How It Works (Technical Overview)
1. The user selects a barber and a specific date.
2. The app queries **Firebase Firestore** to fetch existing bookings for that barber on the chosen date.
3. The JavaScript logic dynamically disables the booked time slots on the UI.
4. Upon confirmation, the app writes the new booking to Firestore and simultaneously triggers **EmailJS** to send a notification.

## 💻 Local Setup (To run this project locally)
1. Clone the repository:
   ```bash
   git clone [https://github.com/ykarem206-web/amr-and-zain-salon.git](https://github.com/ykarem206-web/amr-and-zain-salon.git)