// EchoScopeClientPlanner.jsx with Smart Suggestions, Cost Estimator, and Mini Map Enhancements

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const eventTypes = [
  'Wedding', 'Corporate Event', 'Birthday', 'Bar/Bat Mitzvah', 'Gala',
  'Conference', 'Workshop', 'Retreat', 'Fundraiser', 'Anniversary',
  'Holiday Party', 'Product Launch', 'Reunion', 'Award Ceremony', 'Engagement Party'
];

const menus = [
  { name: 'FORTE Classic Buffet', price: 85, items: ['Caesar Salad', 'Chicken Marsala', 'Seasonal Vegetables'] },
  { name: 'Garden Brunch', price: 65, items: ['Fruit Display', 'Omelet Station', 'Pastries'] },
  { name: 'Evening Elegance', price: 120, items: ['Lobster Bisque', 'Beef Wellington', 'Tiramisu'] }
];

const rooms = [
  { name: 'Ocean Ballroom', capacity: 300, image: 'ocean_view.jpg' },
  { name: 'Garden Terrace', capacity: 100, image: 'garden_view.jpg' },
  { name: 'Skyline Lounge', capacity: 50, image: 'skyline_view.jpg' }
];

export default function EchoScopeClientPlanner() {
  const [info, setInfo] = useState({ name: '', email: '', guests: '', date: '', time: '', type: '' });
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const handleChange = e => setInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = () => setSubmitted(true);

  const today = new Date();
  const selectedDate = new Date(info.date);
  const canBook = (selectedDate - today) / (1000 * 3600 * 24) >= 2;
  const readyToSubmit = selectedMenu && selectedRoom && canBook && info.name && info.email && info.guests;
  const guestCount = parseInt(info.guests) || 0;

  useEffect(() => {
    if (info.type && guestCount) {
      if (guestCount > 200) {
        setSuggestion('🏛 We recommend the Ocean Ballroom for your large guest count.');
      } else if (guestCount <= 200 && guestCount > 80) {
        setSuggestion('🌳 Garden Terrace is a great fit for your event.');
      } else if (guestCount <= 80) {
        setSuggestion('🌆 The Skyline Lounge offers an intimate experience for your size.');
      }
    } else {
      setSuggestion('');
    }
  }, [info.type, guestCount]);

  const totalCost = selectedMenu ? guestCount * selectedMenu.price : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">Plan Your Event with EchoScope</h2>

      {!submitted ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" name="name" placeholder="Name" className="border p-2 rounded" onChange={handleChange} />
            <input type="email" name="email" placeholder="Email" className="border p-2 rounded" onChange={handleChange} />
            <input type="number" name="guests" placeholder="Guest Count" className="border p-2 rounded" onChange={handleChange} />
            <input type="date" name="date" className="border p-2 rounded" onChange={handleChange} />
            <input type="time" name="time" className="border p-2 rounded" onChange={handleChange} />
            <select name="type" className="border p-2 rounded" onChange={handleChange}>
              <option>Select Event Type</option>
              {eventTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
          </div>

          {info.date && !canBook && (
            <p className="text-red-600">📆 Event must be booked at least 48 hours in advance.</p>
          )}

          {suggestion && <p className="text-blue-600 font-medium">💡 {suggestion}</p>}

          <div>
            <h3 className="text-xl font-semibold mb-2">Select a Menu</h3>
            {menus.map(menu => (
              <div key={menu.name}>
                <button
                  onClick={() => setSelectedMenu(menu)}
                  className="bg-blue-500 text-white px-3 py-1 rounded mb-2"
                >
                  {menu.name} (${menu.price}/guest)
                </button>
                <AnimatePresence>
                  {selectedMenu?.name === menu.name && (
                    <motion.div className="bg-white border rounded p-3 mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h4 className="font-semibold">{menu.name}</h4>
                      <ul className="text-sm list-disc pl-5">
                        {menu.items.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {selectedMenu && <p className="text-green-700 font-semibold mt-2">Estimated Total: ${totalCost.toLocaleString()}</p>}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">Choose Your Room</h3>
            <div className="grid grid-cols-3 gap-4">
              {rooms.map((room, i) => (
                <div
                  key={i}
                  className={`border p-3 rounded cursor-pointer transition-shadow hover:shadow-lg ${selectedRoom?.name === room.name ? 'border-blue-600' : ''}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <h4 className="font-semibold">{room.name}</h4>
                  <p>Capacity: {room.capacity}</p>
                  <img src={`/${room.image}`} alt={room.name} className="mt-2 rounded shadow-sm w-full" />
                </div>
              ))}
            </div>
          </div>

          {readyToSubmit && (
            <motion.div className="p-4 bg-green-100 border border-green-600 rounded flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div>
                <h4 className="font-bold">🎉 You're Ready!</h4>
                <p>Proposal: {selectedMenu.name}, {selectedRoom.name}, {info.guests} guests</p>
              </div>
              <button
                onClick={handleSubmit}
                className="ml-4 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
              >
                Next → Generate Proposal
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded border shadow">
          <h3 className="text-2xl font-bold mb-4">🎊 Proposal Summary</h3>
          <ul className="space-y-2">
            <li><strong>Name:</strong> {info.name}</li>
            <li><strong>Email:</strong> {info.email}</li>
            <li><strong>Guests:</strong> {info.guests}</li>
            <li><strong>Event Type:</strong> {info.type}</li>
            <li><strong>Date:</strong> {info.date} at {info.time}</li>
            <li><strong>Menu:</strong> {selectedMenu.name} (${selectedMenu.price}/guest)</li>
            <li><strong>Room:</strong> {selectedRoom.name}</li>
            <li><strong>Total Estimate:</strong> ${totalCost.toLocaleString()}</li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}
