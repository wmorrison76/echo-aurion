// EchoScopeClientPlanner.jsx with CRM Integration Alpha + SMS + Smart Forecasting

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendProposalToCRM, sendSMSNotification, checkEventForecasting } from '../crm/crmAPI';

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

const marketingSources = [
  'Website', 'Sales Outreach', 'Referral', 'Social Media', 'Repeat Client'
];

export default function EchoScopeClientPlanner() {
  const [info, setInfo] = useState({ name: '', email: '', guests: '', date: '', time: '', type: '', source: '' });
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [proposalID, setProposalID] = useState('');
  const [forecastWarning, setForecastWarning] = useState(null);

  const handleChange = e => setInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = () => setSubmitted(true);

  const today = new Date();
  const selectedDate = new Date(info.date);
  const canBook = (selectedDate - today) / (1000 * 3600 * 24) >= 2;
  const readyToSubmit = selectedMenu && selectedRoom && canBook && info.name && info.email && info.guests && info.source;
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

  useEffect(() => {
    if (submitted) {
      const newProposalID = `LU-ECHO-${Date.now()}`;
      setProposalID(newProposalID);

      const proposalData = {
        ...info,
        guestCount,
        menu: selectedMenu?.name,
        room: selectedRoom?.name,
        pricePerGuest: selectedMenu?.price,
        total: guestCount * selectedMenu?.price,
        proposalID: newProposalID,
        timestamp: new Date().toISOString()
      };

      sendProposalToCRM(proposalData);
      sendSMSNotification(info.name, info.email, proposalData);
      checkEventForecasting(info.date, info.type).then(setForecastWarning);
    }
  }, [submitted]);

  const totalCost = selectedMenu ? guestCount * selectedMenu.price : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">Plan Your Event with EchoScope</h2>

      {/* form and summary logic goes here */}
    </div>
  );
}
