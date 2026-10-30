import React, { useEffect, useState } from 'react';

const WebSocketComponent = ({notifications, setNotifications}) => {

  console.log("NEW NOTIFICATIONS", notifications);

  useEffect(() => {
    // WebSocket connection URL
    const socketUrl = 'ws://localhost:8080/ws/doctor_notifications/';

    // Create a new WebSocket instance
    const socket = new WebSocket(socketUrl);

    // Event listener for when the connection is established
    socket.addEventListener('open', (event) => {
      console.log('WebSocket connection opened:', event);
    });

    // Event listener for incoming messages
    socket.addEventListener('message', (event) => {
      console.log('WebSocket message received:', event.data);
      
      // Parse the incoming message (assuming it's JSON for simplicity)
      const newNotification = JSON.parse(event.data);

      // Update the component state with the new notification
      setNotifications((prevNotifications) => [...prevNotifications, newNotification]);

      // You can handle the incoming message further as needed
    });

    // Event listener for socket errors
    socket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
    });

    // Event listener for when the connection is closed
    socket.addEventListener('close', (event) => {
      console.log('WebSocket connection closed:', event);
    });

    // Cleanup the WebSocket connection when the component unmounts
    return () => {
      socket.close();
    };
  }, []); // Empty dependency array to run the effect only once on mount

  return (
    <div className='h-48 w-48'>
      <p>New notifications:</p>
      <ul>
        {notifications?.map((notification, index) => (
          <li key={index}>{notification.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default WebSocketComponent;
