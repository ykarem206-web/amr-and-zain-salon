import { db, auth } from "./firebase-config.js";
import { collection, addDoc, getDocs, onSnapshot, query, where, orderBy, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Route Protection: Ensure only authenticated users can access the dashboard
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html"; 
    } else {
        fetchBookings();
    }
});

// Handle user logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
});

const tableBody = document.getElementById('bookings-table-body');
const totalCount = document.getElementById('total-bookings');

let allBookingsData = []; 
let currentFilter = "أبو عمرو"; 

// Fetch real-time booking data from Firestore
function fetchBookings() {
    const q = query(collection(db, "bookings"));

    onSnapshot(q, (snapshot) => {
        allBookingsData = [];
        snapshot.forEach((booking) => {
            const data = booking.data();

            if (!data.customerName || !data.bookingDate || !data.bookingTime) {
                    console.warn("تم تخطي حجز غير مكتمل أو بايظ:", booking.id);
                    return; 
            }
            
            data.id = booking.id;
            allBookingsData.push(data);
        });
        renderBookings(); 
    });
}

// Render, filter, and sort bookings in the dashboard table
function renderBookings() {
    tableBody.innerHTML = '';
    
    // Apply active barber filter
    let filteredBookings = allBookingsData.filter(booking => booking.barberName === currentFilter);

    // Update total bookings counter
    totalCount.innerText = filteredBookings.length;

    // Arabic months dictionary for chronological sorting
    const arabicMonths = {
        "يناير": 0, "فبراير": 1, "مارس": 2, "أبريل": 3, "مايو": 4, "يونيو": 5,
        "يوليو": 6, "أغسطس": 7, "سبتمبر": 8, "أكتوبر": 9, "نوفمبر": 10, "ديسمبر": 11
    };

    // Sort bookings chronologically (closest date first)
    filteredBookings.sort((a, b) => {
        const currentYear = new Date().getFullYear();
        let timeA = 0, timeB = 0;

        if (a.bookingDate) {
            const partsA = a.bookingDate.split(" ");
            if (partsA.length >= 3) timeA = new Date(currentYear, arabicMonths[partsA[2]], parseInt(partsA[1])).getTime();
        }
        if (b.bookingDate) {
            const partsB = b.bookingDate.split(" ");
            if (partsB.length >= 3) timeB = new Date(currentYear, arabicMonths[partsB[2]], parseInt(partsB[1])).getTime();
        }

        if (timeA === timeB) return a.bookingTime.localeCompare(b.bookingTime);
        return timeA - timeB;
    });

    // Render filtered bookings to the DOM
    filteredBookings.forEach((data) => {
        const row = `
            <tr class="flex flex-col md:table-row border-b p-4 md:p-0 hover:bg-gray-50 transition">
                <td class="block md:table-cell py-1 md:p-4 font-bold text-xl md:text-base text-center md:text-right">${data.customerName}</td>
                <td class="block md:table-cell py-1 md:p-4 text-center md:text-right text-gray-500 font-semibold md:font-normal">${data.customerPhone}</td>
                <td class="block md:table-cell py-2 md:p-4 text-center md:text-right"><span class="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-800 font-bold">${data.barberName}</span></td>
                <td class="block md:table-cell py-1 md:p-4 text-sm text-center md:text-right text-blue-700 font-bold md:font-normal md:text-gray-700" dir="rtl">${data.bookingDate} - الساعة ${data.bookingTime}</td>
                <td class="block md:table-cell py-3 md:p-4 text-center md:text-right mt-2 md:mt-0">
                    <button onclick="deleteBooking('${data.id}')" class="w-full md:w-auto bg-green-600 text-white px-4 py-3 md:py-1 rounded-md text-sm hover:bg-green-700 shadow-sm font-bold md:font-normal">تمت الحلاقة ✔️</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Handle filter button state and styling
window.setFilter = (barberName) => {
    currentFilter = barberName;
    
    const activeClass = "bg-gray-800 text-white px-4 py-1.5 rounded-md text-sm transition font-bold shadow";
    const inactiveClass = "bg-white text-gray-700 border border-gray-300 px-4 py-1.5 rounded-md text-sm hover:bg-gray-100 transition shadow-sm";

    // Toggle active class for selected barber
    document.getElementById('btn-abo-amr').className = barberName === 'أبو عمرو' ? activeClass : inactiveClass;
    document.getElementById('btn-yousef').className = barberName === 'يوسف' ? activeClass : inactiveClass;
    document.getElementById('btn-fekry').className = barberName === 'فكري' ? activeClass : inactiveClass;

    renderBookings(); 
};

// Mark booking as completed (Deletes record from Firestore)
window.deleteBooking = async (id) => {
    if(confirm("هل أنت متأكد من مسح هذا الحجز؟")) {
        try {
            await deleteDoc(doc(db, "bookings", id));
        } catch (error) {
            alert("حدث خطأ أثناء المسح");
        }
    }
}

// --- Day-Off Management System ---
const blockDateInput = document.getElementById('block-date-input');
const blockDateBtn = document.getElementById('block-date-btn');
const blockedDatesList = document.getElementById('blocked-dates-list');
const blockBarberInput = document.getElementById('block-barber-input');

// Add a new closed date/day-off to Firestore
blockDateBtn.addEventListener('click', async () => {
    const dateToBlock = blockDateInput.value;
    if (!dateToBlock) {
        alert("برجاء اختيار تاريخ أولاً!");
        return;
    }
    try {
        blockDateBtn.innerText = "جاري الإغلاق...";
        await addDoc(collection(db, "closedDates"), {
            date: dateToBlock,
            barber: blockBarberInput.value
        });
        blockDateInput.value = "";
        blockDateBtn.innerText = "تأكيد إغلاق اليوم";
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء إغلاق اليوم.");
    }
});

// Real-time listener for closed dates to update the UI
onSnapshot(collection(db, "closedDates"), (snapshot) => {
    blockedDatesList.innerHTML = ""; 
    if (snapshot.empty) {
        blockedDatesList.innerHTML = '<span class="text-gray-500">لا توجد أيام مغلقة حالياً.</span>';
        return;
    }
    snapshot.forEach((docSnap) => {
        const closedDate = docSnap.data().date;
        const closedBarber = docSnap.data().barber || "الكل";
        const docId = docSnap.id;
        
        blockedDatesList.innerHTML += `
            <div class="bg-red-100 text-red-800 px-3 py-1 rounded-full flex items-center gap-2 border border-red-200">
                <span class="font-bold text-sm" dir="ltr">${closedDate} <span class="text-red-500">(${closedBarber})</span></span>
                <button onclick="unblockDate('${docId}')" class="text-red-500 hover:text-red-800 font-bold text-lg leading-none">&times;</button>
            </div>
        `;
    });
});

// Remove a day-off restriction (Exposed globally for inline onclick)
window.unblockDate = async (id) => {
    if(confirm("هل أنت متأكد من فتح هذا اليوم للحجوزات مرة أخرى؟")) {
        await deleteDoc(doc(db, "closedDates", id));
    }
};