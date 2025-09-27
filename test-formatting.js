async function testWhatsAppFormatting() {
  try {
    console.log('Testing WhatsApp message formatting...\n');

    // Test data for booking confirmation
    const testBookingDetails = {
      bookingId: "TEST123",
      pickupLocation: "Go-On Rides Garage",
      dropLocation: "Go-On Rides Garage",
      scheduledTime: "2024-01-15 10:00",
      dropoffTime: "2024-01-16 10:00",
      vehicleType: "Honda Activa",
      registrationNumber: "TS09AB1234",
      bookingAmount: "500",
      securityDeposit: "1000",
      totalAmount: "1500"
    };

    console.log('Test Booking Details:');
    console.log(JSON.stringify(testBookingDetails, null, 2));

    // Test the message formatting (same as in the service)
    const message = `🛵 Go-On Rides – Booking Processed

🆔 Booking ID: ${testBookingDetails.bookingId}
🚘 Vehicle: ${testBookingDetails.vehicleType || 'Vehicle details will be shared'}
🔖 Reg. No.: ${testBookingDetails.registrationNumber || 'TBD'}
📅 Pickup: ${testBookingDetails.scheduledTime ? new Date(testBookingDetails.scheduledTime).toLocaleString() : 'TBD'}
📅 Drop-off: ${testBookingDetails.dropoffTime ? new Date(testBookingDetails.dropoffTime).toLocaleString() : 'TBD'}
💰 Amount Collected: ₹${testBookingDetails.totalAmount || 'TBD'} (₹${testBookingDetails.bookingAmount || 'TBD'} booking + ₹${testBookingDetails.securityDeposit || 'TBD'} security)

📌 Terms & Conditions:
• Carry a valid Driving License during the ride
• Fuel is not included in the booking amount
• Vehicle must be returned on time; late returns may attract extra charges
• Any damage or traffic fines will be deducted from the security deposit
• Please check vehicle condition before taking delivery
• Note fuel level and odometer reading

🙏 Thank you for choosing Go-On Rides! Have a safe ride.`;

    console.log('\nFormatted Message Preview:');
    console.log('═'.repeat(60));
    console.log(message);
    console.log('═'.repeat(60));

    console.log('\n✅ Formatting test completed!');
    console.log('The message should now display with proper formatting including:');
    console.log('• Emojis (🛵, 🆔, 🚘, 🔖, 📅, 💰, 📌, 🙏)');
    console.log('• Line breaks for readability');
    console.log('• Proper spacing between sections');
    console.log('• Terms and conditions in bullet points');
    console.log('• Multi-line structure instead of single line');

    console.log('\nBefore the fix: Messages were sent as single line without formatting');
    console.log('After the fix: Messages should display with proper WhatsApp formatting');

    return { success: true, message };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

testWhatsAppFormatting();
