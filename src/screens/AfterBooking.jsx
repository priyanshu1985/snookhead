import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function AfterBooking({ route, navigation }) {
  const {
    table,
    session,
    gameType,
    timeOption = 'Set Time',
    timeDetails,
    preSelectedFoodItems = [], // Food items added during booking
  } = route.params || {};

  console.log('AfterBooking received params:', {
    table: table?.name,
    session: session?.id,
    gameType,
    timeOption,
    timeDetails,
    preSelectedFoodItems: preSelectedFoodItems?.length || 0,
  });

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // For stopwatch mode
  const [timerExpired, setTimerExpired] = useState(false);
  const [sessionData, setSessionData] = useState(session);
  const [frameCount, setFrameCount] = useState(
    timeDetails?.selectedFrame ? parseInt(timeDetails.selectedFrame) : 0,
  );

  // Determine booking type: 'Set Time' = countdown, 'Timer' = stopwatch, 'Select Frame' = frame-based
  const isStopwatchMode = timeOption === 'Timer';
  const isFrameMode = timeOption === 'Select Frame';
  const isCountdownMode = timeOption === 'Set Time' || (!isStopwatchMode && !isFrameMode);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [loading, setLoading] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [totalBill, setTotalBill] = useState(0);
  const [tableCharges, setTableCharges] = useState(0);
  const [menuCharges, setMenuCharges] = useState(0);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [isCalculatingBill, setIsCalculatingBill] = useState(false);
  const [billData, setBillData] = useState(null);

  // Queue State
  const [nextInQueue, setNextInQueue] = useState(null);

  // Initialize timer based on booking type
  useEffect(() => {
    if (isStopwatchMode || isFrameMode) {
      // Stopwatch/Frame mode: Calculate elapsed time from start
      const startTime = new Date(sessionData?.start_time || sessionData?.starttime || new Date());
      const now = new Date();
      const elapsedSecs = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(elapsedSecs);
      setTotalDurationSeconds(0); // No fixed duration
      setRemainingSeconds(0); // Not used in stopwatch mode
    } else if (sessionData?.booking_end_time || sessionData?.bookingendtime) {
      // Countdown mode: Calculate remaining time from booking_end_time
      const endTime = new Date(sessionData.booking_end_time || sessionData.bookingendtime);
      const now = new Date();
      const remainingMs = endTime - now;
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setRemainingSeconds(remainingSecs);

      // Set total duration for display
      if (sessionData?.duration_minutes || sessionData?.durationminutes) {
        setTotalDurationSeconds((sessionData.duration_minutes || sessionData.durationminutes) * 60);
      } else {
        setTotalDurationSeconds(remainingSecs);
      }
    } else if (sessionData?.duration_minutes || sessionData?.durationminutes) {
      // Fallback countdown: use duration_minutes from start_time
      const durationSecs = (sessionData.duration_minutes || sessionData.durationminutes) * 60;
      const startTime = new Date(sessionData.start_time || sessionData.starttime);
      const now = new Date();
      const elapsedSecs = Math.floor((now - startTime) / 1000);
      const remainingSecs = Math.max(0, durationSecs - elapsedSecs);
      setRemainingSeconds(remainingSecs);
      setTotalDurationSeconds(durationSecs);
    }
  }, [sessionData, isStopwatchMode, isFrameMode]);

  // Timer logic - different behavior based on mode
  useEffect(() => {
    // Skip timer for Frame mode (no automatic timer)
    if (isFrameMode) {
      return;
    }

    if (isStopwatchMode) {
      // Stopwatch mode: Count UP every second (no auto-release)
      const interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Countdown mode: Check for expiration and auto-release
      if (remainingSeconds <= 0 && totalDurationSeconds > 0 && !timerExpired) {
        // Timer has expired - auto-generate bill (only for countdown mode)
        setTimerExpired(true);
        handleTimerExpired();
        return;
      }

      const interval = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [remainingSeconds, totalDurationSeconds, timerExpired, isStopwatchMode, isFrameMode]);

  // Handle timer expiration - auto generate bill silently
  const handleTimerExpired = async () => {
    // Auto-generate bill silently without any alert
    console.log('Timer expired - auto generating bill silently');
    await handleGenerateBillSilent();
  };

  // Generate bill silently (for auto-generation when timer expires)
  const handleGenerateBillSilent = async () => {
    try {
      setIsCalculatingBill(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token for silent bill generation');
        navigation.navigate('MainTabs', { screen: 'Bill' });
        return;
      }

      let validSessionId = null;
      const rawSessionId =
        sessionData?.active_id || sessionData?.id || sessionData?.activeid;
      if (rawSessionId) {
        const sessionIdInt = parseInt(rawSessionId);
        if (!isNaN(sessionIdInt) && sessionIdInt > 0) {
          validSessionId = sessionIdInt;
        }
      }

      const billRequest = {
        customer_name:
          route.params?.customerName ||
          sessionData?.customer_name ||
          sessionData?.customername ||
          'Walk-in Customer',
        customer_phone:
          route.params?.customerPhone ||
          sessionData?.customer_phone ||
          sessionData?.customerphone ||
          '+91 XXXXXXXXXX',
        table_id: table?.id ? parseInt(table.id) : null,
        session_id: validSessionId,
        selected_menu_items: billItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity || 1,
        })),
        session_duration: Math.ceil(totalDurationSeconds / 60),
        booking_time: sessionData?.start_time || sessionData?.starttime,
        table_price_per_min: parseFloat(
          table?.pricePerMin || table?.price_per_min || 10,
        ),
        frame_charges:
          timeOption === 'Select Frame'
            ? frameCount *
              parseFloat(table?.pricePerFrame || table?.price_per_frame || 100)
            : 0,
      };

      console.log('Silent bill generation:', billRequest);

      const response = await fetch(`${API_URL}/api/bills/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(billRequest),
      });

      const result = await response.json();

      if (response.ok) {
        // End the session and free the table using auto-release
        try {
          await fetch(`${API_URL}/api/activeTables/auto-release`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              active_id: validSessionId,
              cart_items: billItems.map(item => ({
                menu_item_id: item.id,
                quantity: item.quantity || 1,
                id: item.id, // Match backend expectation
                qty: item.quantity || 1, // Match backend expectation
              })),
            }),
          });
          console.log('Session ended, table is now available for next booking');
          
          if (releaseResponse.ok) {
              const releaseResult = await releaseResponse.json();
              if (releaseResult.queueAssignment && releaseResult.queueAssignment.assigned) {
                  Alert.alert(
                      'Queue Assigned',
                      `Table has been automatically assigned to ${releaseResult.queueAssignment.queueEntry.customername}.`,
                      [{ text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Bill' }) }]
                  );
                  return; // Stop here, wait for user to click OK
              }
          }
        } catch (sessionError) {
          console.warn('Failed to end session:', sessionError);
        }

        console.log('Bill generated silently:', result.bill?.bill_number);
        // Navigate to Bill screen without any alert
        navigation.navigate('MainTabs', { screen: 'Bill' });
      } else {
        console.error('Silent bill generation failed:', result.error);
        navigation.navigate('MainTabs', { screen: 'Bill' });
      }
    } catch (error) {
      console.error('Silent bill generation error:', error);
      navigation.navigate('MainTabs', { screen: 'Bill' });
    } finally {
      setIsCalculatingBill(false);
    }
  };

  // Calculate pricing in real-time
  useEffect(() => {
    calculatePricing();
  }, [remainingSeconds, totalDurationSeconds, elapsedSeconds, billItems, table, isStopwatchMode]);

  // Initialize with pre-selected food items from TableBookingScreen
  useEffect(() => {
    if (preSelectedFoodItems && preSelectedFoodItems.length > 0) {
      console.log(
        'Initializing with pre-selected food items:',
        preSelectedFoodItems,
      );
      const formattedItems = preSelectedFoodItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
        category: item.category || 'Food',
        fromPreBooking: true, // Mark as added during booking
      }));
      setBillItems(formattedItems);
    }
  }, []);

  // Fetch menu items and existing session orders on component mount
  useEffect(() => {
    fetchMenuItems();
    fetchExistingOrders();
    fetchMenuItems();
    fetchExistingOrders();
    fetchQueue();
  }, []);

  // Fetch queue for this game/table
  const fetchQueue = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const gameId = table?.game_id || table?.gameid;
      if (!gameId) return;

      const response = await fetch(`${API_URL}/api/queue?gameid=${gameId}&status=waiting`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const queueList = await response.json();
        // Priority: 1. Preferred this table, 2. No preference
        const nextForThisTable = queueList.find(q => 
          q.preferredtableid && String(q.preferredtableid) === String(table.id)
        ) || queueList.find(q => !q.preferredtableid);

        setNextInQueue(nextForThisTable || null);
      }
    } catch (err) {
      console.log('Error fetching queue:', err);
    }
  };

  // Fetch existing orders for this session (to include food already ordered)
  const fetchExistingOrders = async () => {
    try {
      const sessionId =
        sessionData?.active_id || sessionData?.id || sessionData?.activeid;
      if (!sessionId) {
        console.log('No session ID available, skipping order fetch');
        return;
      }

      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      console.log('Fetching existing orders for session:', sessionId);

      const response = await fetch(
        `${API_URL}/api/orders/by-session/${sessionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Existing session orders:', result);

        // Add consolidated items to billItems (avoid duplicates)
        if (result.consolidated_items && result.consolidated_items.length > 0) {
          setBillItems(prevItems => {
            const existingIds = new Set(prevItems.map(item => item.id));
            const newItems = result.consolidated_items
              .filter(item => !existingIds.has(item.id))
              .map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
                fromExistingOrder: true, // Mark as already ordered
              }));

            // Merge quantities for items that exist in both
            const mergedItems = prevItems.map(prevItem => {
              const matchingNew = result.consolidated_items.find(
                i => i.id === prevItem.id,
              );
              if (matchingNew) {
                return {
                  ...prevItem,
                  quantity: prevItem.quantity + matchingNew.quantity,
                };
              }
              return prevItem;
            });

            return [...mergedItems, ...newItems];
          });

          console.log('Added existing order items to bill');
        }
      } else {
        console.log(
          'No existing orders found for session or error:',
          response.status,
        );
      }
    } catch (error) {
      console.error('Error fetching existing orders:', error);
    }
  };

  // Calculate comprehensive pricing
  const calculatePricing = async () => {
    try {
      // Calculate table charges based on booked duration or elapsed time
      let calculatedTableCharges = 0;
      let billableMinutes = 0;

      if (isStopwatchMode) {
        billableMinutes = Math.ceil(elapsedSeconds / 60);
      } else {
        billableMinutes = Math.ceil(totalDurationSeconds / 60);
      }

      if (table && billableMinutes > 0) {
        let pricePerMin = parseFloat(
          table.pricePerMin || table.price_per_min || 10,
        );
        const frameCharge = parseFloat(table.frameCharge || 0);

        // Debug logging
        console.log('Frontend pricing debug:', {
          billableMinutes,
          original_pricePerMin: pricePerMin,
          frameCharge,
        });

        // If the price seems too high (>100), assume it's per hour and convert to per minute
        if (pricePerMin > 100) {
          pricePerMin = pricePerMin / 60;
          console.log('Converted hourly rate to per minute:', pricePerMin);
        }

        if (timeOption === 'Select Frame' && frameCount > 0) {
          // Use frameCharge as the price per frame
          const pricePerFrame = parseFloat(table.frameCharge || table.pricePerFrame || 100);
          calculatedTableCharges = frameCount * pricePerFrame;
        } else {
          calculatedTableCharges =
            billableMinutes * pricePerMin + frameCharge;
        }

        console.log('Calculated table charges:', calculatedTableCharges);
      }

      // Calculate menu charges
      const calculatedMenuCharges = billItems.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = item.quantity || 1;
        const itemTotal = itemPrice * itemQuantity;
        console.log(
          `Menu item: ${item.name}, Price: ${itemPrice}, Quantity: ${itemQuantity}, Total: ${itemTotal}`,
        );
        return sum + itemTotal;
      }, 0);

      console.log('Final calculations:', {
        tableCharges: calculatedTableCharges,
        menuCharges: calculatedMenuCharges,
        totalBill: calculatedTableCharges + calculatedMenuCharges,
      });

      setTableCharges(calculatedTableCharges);
      setMenuCharges(calculatedMenuCharges);
      setTotalBill(calculatedTableCharges + calculatedMenuCharges);
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
  };

  // Fetch menu items from backend
  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/menu`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const items = Array.isArray(result) ? result : result.data || [];

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(items.map(item => item.category || 'Food')),
        ];
        setCategories(
          uniqueCategories.length > 0
            ? uniqueCategories
            : ['Food', 'Fast Food', 'Beverages'],
        );

        setMenuItems(items);
        console.log('Fetched menu items:', items);
      } else {
        console.error('Failed to fetch menu items:', response.status);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format countdown time display (MM:SS or HH:MM:SS)
  const formatCountdownTime = totalSeconds => {
    if (totalSeconds <= 0) return '00:00';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  // Get timer status text and color
  const getTimerStatus = () => {
    if (remainingSeconds <= 0) {
      return { text: 'Time Expired', color: '#FF4444' };
    } else if (remainingSeconds <= 60) {
      return { text: 'Less than 1 minute!', color: '#FF8C00' };
    } else if (remainingSeconds <= 300) {
      return { text: 'Less than 5 minutes', color: '#FFA500' };
    }
    return { text: 'Session Running', color: '#4CAF50' };
  };

  // Add item to bill
  const handleAddToBill = menuItem => {
    const existingItem = billItems.find(item => item.id === menuItem.id);

    if (existingItem) {
      // Increase quantity if item already exists
      setBillItems(prev =>
        prev.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      // Add new item to bill
      setBillItems(prev => [
        ...prev,
        {
          ...menuItem,
          quantity: 1,
          price: menuItem.price || 0,
        },
      ]);
    }

    Alert.alert('Added to Bill', `${menuItem.name} added to your bill`);
  };

  // Remove item from bill
  const handleRemoveFromBill = itemId => {
    setBillItems(prev => {
      const existingItem = prev.find(item => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        // Decrease quantity
        return prev.map(item =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item,
        );
      } else {
        // Remove item completely
        return prev.filter(item => item.id !== itemId);
      }
    });
  };

  // Get filtered menu items by category
  const getFilteredMenuItems = () => {
    return menuItems.filter(
      item => (item.category || 'Food') === selectedCategory,
    );
  };

  // Helper to get full menu image URL
  const getMenuImageUrl = imageKey => {
    if (!imageKey) return null;
    return `${API_URL}/static/menu-images/${encodeURIComponent(imageKey)}`;
  };

  const handleUpdate = () => {
    // Navigate to update/modify session screen
    Alert.alert('Update', 'Update session functionality');
  };

  // Show bill preview before final generation
  const handleShowBillPreview = () => {
    if (totalBill <= 0) {
      Alert.alert(
        'No Charges',
        'No table time or menu items selected. Please play for some time or add menu items to generate a bill.',
      );
      return;
    }
    setShowBillPreview(true);
  };

  // Generate final bill and store in database (manual/early generation)
  const handleGenerateBill = async () => {
    try {
      setIsCalculatingBill(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      // Calculate billable time based on booking mode
      let billableDuration = 0;
      let tableCharges = 0;
      let isEarlyGeneration = false;

      const pricePerMin = parseFloat(table?.pricePerMin || table?.price_per_min || 10);
      // Use frameCharge as price per frame
      const pricePerFrame = parseFloat(table?.frameCharge || table?.pricePerFrame || table?.price_per_frame || 100);

      if (isFrameMode) {
        // Frame mode: Bill based on frames played, not time
        billableDuration = 0; // No time-based billing
        tableCharges = frameCount * pricePerFrame;
        console.log('Frame mode billing:', { frameCount, pricePerFrame, tableCharges });
      } else if (isStopwatchMode) {
        // Stopwatch mode: Bill based on elapsed time (counting up)
        billableDuration = Math.ceil(elapsedSeconds / 60); // Minutes played
        tableCharges = billableDuration * pricePerMin;
        console.log('Stopwatch mode billing:', { elapsedSeconds, billableDuration, pricePerMin, tableCharges });
      } else {
        // Countdown mode: Bill based on booked duration or actual time used
        const actualTimeUsedSeconds = totalDurationSeconds - remainingSeconds;
        const actualTimeUsedMinutes = Math.ceil(actualTimeUsedSeconds / 60);
        isEarlyGeneration = remainingSeconds > 0;
        billableDuration = isEarlyGeneration
          ? actualTimeUsedMinutes
          : Math.ceil(totalDurationSeconds / 60);
        tableCharges = billableDuration * pricePerMin;
        console.log('Countdown mode billing:', { billableDuration, isEarlyGeneration, tableCharges });
      }

      let validSessionId = null;
      const rawSessionId =
        sessionData?.active_id || sessionData?.id || sessionData?.activeid;
      if (rawSessionId) {
        const sessionIdInt = parseInt(rawSessionId);
        if (!isNaN(sessionIdInt) && sessionIdInt > 0) {
          validSessionId = sessionIdInt;
        }
      }

      const billRequest = {
        customer_name:
          route.params?.customerName ||
          sessionData?.customer_name ||
          sessionData?.customername ||
          'Walk-in Customer',
        customer_phone:
          route.params?.customerPhone ||
          sessionData?.customer_phone ||
          sessionData?.customerphone ||
          '+91 XXXXXXXXXX',
        table_id: table?.id ? parseInt(table.id) : null,
        session_id: validSessionId,
        selected_menu_items: billItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity || 1,
        })),
        session_duration: billableDuration,
        booking_time: sessionData?.start_time || sessionData?.starttime,
        table_price_per_min: pricePerMin,
        frame_charges: isFrameMode ? tableCharges : 0,
        booking_type: isFrameMode ? 'frame' : isStopwatchMode ? 'set' : 'timer',
        frame_count: isFrameMode ? frameCount : null,
        is_early_checkout: isEarlyGeneration,
      };

      console.log('Creating bill with data:', billRequest);

      const response = await fetch(`${API_URL}/api/bills/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(billRequest),
      });

      const result = await response.json();

      if (response.ok) {
        // Stop the timer immediately
        setTimerExpired(true);
        setRemainingSeconds(0);

        // End the session and free the table using auto-release
        let autoAssigned = false;
        try {
          const releaseResponse = await fetch(`${API_URL}/api/activeTables/auto-release`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              active_id: validSessionId,
              cart_items: billItems.map(item => ({
                menu_item_id: item.id,
                quantity: item.quantity || 1,
                id: item.id, // Match backend expectation
                qty: item.quantity || 1, // Match backend expectation
              })),
            }),
          });
          
          if (releaseResponse.ok) {
              const releaseResult = await releaseResponse.json();
              if (releaseResult.queueAssignment && releaseResult.queueAssignment.assigned) {
                  autoAssigned = true;
                  Alert.alert(
                      'Queue Assigned',
                      `Table has been automatically assigned to ${releaseResult.queueAssignment.queueEntry.customername}.`,
                      [{ text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Bill' }) }]
                  );
              }
          }
          console.log('Session ended, table released. Auto-assigned:', autoAssigned);
        } catch (sessionError) {
          console.warn('Failed to end session:', sessionError);
        }

        // Only prompt if NOT auto-assigned
        if (!autoAssigned) {
            if (nextInQueue) {
              Alert.alert(
                'Assign Next in Queue?',
                `${nextInQueue.customername} is waiting for this table.\nAssign them now?`,
                [
                  {
                    text: 'No, Just Clear',
                    onPress: () => navigation.navigate('MainTabs', { screen: 'Bill' }),
                    style: 'cancel'
                  },
                  {
                    text: 'Yes, Assign',
                    onPress: () => assignTableToQueue(nextInQueue, validSessionId)
                  }
                ]
              );
            } else {
              // Navigate directly to Bill screen
              navigation.navigate('MainTabs', { screen: 'Bill' });
            }
        }
      } else {
        throw new Error(result.error || 'Failed to create bill');
      }
    } catch (error) {
      console.error('Bill generation error:', error);
      Alert.alert(
        'Bill Generation Failed',
        error.message || 'Failed to generate bill. Please try again.',
      );
    } finally {
      setIsCalculatingBill(false);
    }
  };

  const assignTableToQueue = async (queueEntry, previousSessionId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // 1. Assign table to queue entry (this starts the session logically in backend queue)
      // But actually, backend /assign endpoint updates Queue status to 'seated' AND Table status to 'occupied'
      // It does NOT create a Session entry in 'active_table_sessions' (which frontend relies on).
      // We need to call /activeTables/start separately or rely on /assign to do it (backend analysis showed it passes 'tableid' and updates status).
      // Backend /assign only updates TableAsset status. It does NOT seem to insert into active_game_sessions.
      // So we should probably navigate to TableBookingScreen or manually start session.
      
      // Let's use the standard booking flow to ensure session is created correctly.
      navigation.navigate('TableBookingScreen', {
        table: { ...table, status: 'available' }, // Fake available so we don't get blocked
        gameType: gameType,
        color: route.params?.color,
        prefillCustomer: {
          name: queueEntry.customername,
          phone: queueEntry.phone
        },
        queueEntryId: queueEntry.id // Pass ID to mark as served/seated later if needed
      });

      // Alternatively, we could call the backend to "Seat" them which might be enough if backend handles session creation?
      // Looking at backend `assign` endpoint: 
      // await Queue.update({ status: "seated" }...)
      // await TableAsset.update({ status: "occupied" }...)
      // It does NOT create a session.
      
      // So navigating to TableBookingScreen is safer, but we need to pass the "Queue Context".
    } catch (error) {
       console.error("Error assigning queue:", error);
       navigation.navigate('MainTabs', { screen: 'Bill' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gameType || 'Snooker'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Table Badge */}
        <View style={styles.tableBadge}>
          <Text style={styles.tableName}>{table?.name || 'Table'}</Text>
        </View>

        {/* Timer Display - Different modes */}
        {isFrameMode ? (
          /* Frame Mode Display */
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Frame-Based Session</Text>
            <View style={styles.frameDisplay}>
              <Text style={styles.frameCountLarge}>{frameCount}</Text>
              <Text style={styles.frameCountLabel}>
                {frameCount === 1 ? 'Frame' : 'Frames'}
              </Text>
              <Text style={[styles.timerDurationInfo, { marginTop: 4 }]}>
                Elapsed: {formatCountdownTime(elapsedSeconds)}
              </Text>
            </View>
            <View style={styles.timerStatus}>
              <Icon name="apps-outline" size={12} color="#4CAF50" />
              <Text style={[styles.timerStatusText, { color: '#4CAF50' }]}>
                Manual billing when done
              </Text>
            </View>
            <View style={styles.frameControls}>
              <TouchableOpacity
                style={styles.frameControlBtn}
                onPress={() => setFrameCount(prev => Math.max(1, prev - 1))}
              >
                <Icon name="remove" size={20} color="#FF8C42" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.frameControlBtn}
                onPress={() => setFrameCount(prev => prev + 1)}
              >
                <Icon name="add" size={20} color="#FF8C42" />
              </TouchableOpacity>
            </View>
            <Text style={styles.frameHint}>
              Adjust frame count as games are played
            </Text>
          </View>
        ) : isStopwatchMode ? (
          /* Stopwatch Mode Display - Counts UP */
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Time Elapsed</Text>
            <Text style={[styles.timerValue, styles.timerValueStopwatch]}>
              {formatCountdownTime(elapsedSeconds)}
            </Text>
            <View style={styles.timerStatus}>
              <Icon name="stopwatch-outline" size={12} color="#2196F3" />
              <Text style={[styles.timerStatusText, { color: '#2196F3' }]}>
                Running - Generate bill when done
              </Text>
            </View>
            <Text style={styles.timerDurationInfo}>
              Bill = ₹{table?.pricePerMin || table?.price_per_min || 10}/min ×{' '}
              {Math.ceil(elapsedSeconds / 60)} min
            </Text>
          </View>
        ) : (
          /* Countdown Mode Display - Original behavior */
          <View
            style={[
              styles.timerContainer,
              remainingSeconds <= 60 &&
                remainingSeconds > 0 &&
                styles.timerContainerWarning,
            ]}
          >
            <Text style={styles.timerLabel}>Time Remaining</Text>
            <Text
              style={[
                styles.timerValue,
                remainingSeconds <= 60 && styles.timerValueWarning,
                remainingSeconds <= 0 && styles.timerValueExpired,
              ]}
            >
              {formatCountdownTime(remainingSeconds)}
            </Text>
            <View style={styles.timerStatus}>
              <Icon
                name={remainingSeconds <= 0 ? 'alert-circle' : 'radio-button-on'}
                size={12}
                color={getTimerStatus().color}
              />
              <Text
                style={[
                  styles.timerStatusText,
                  { color: getTimerStatus().color },
                ]}
              >
                {getTimerStatus().text}
              </Text>
            </View>
            {totalDurationSeconds > 0 && (
              <Text style={styles.timerDurationInfo}>
                Booked: {Math.ceil(totalDurationSeconds / 60)} minutes
              </Text>
            )}
          </View>

        )}

        {/* Next in Queue Indicator */}
        {nextInQueue && (
          <View style={{
            backgroundColor: '#E3F2FD',
            padding: 12,
            borderRadius: 12,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: '#2196F3',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <View>
              <Text style={{fontSize: 12, color: '#1976D2', fontWeight: '700'}}>NEXT IN QUEUE</Text>
              <Text style={{fontSize: 16, color: '#0D47A1', fontWeight: '700', marginTop: 2}}>{nextInQueue.customername}</Text>
              <Text style={{fontSize: 12, color: '#555'}}>Waited: {Math.floor((new Date() - new Date(nextInQueue.createdat))/60000)} mins</Text>
            </View>
            <Icon name="people-circle" size={32} color="#2196F3" />
          </View>
        )}

        {/* Time Selection Options */}
        <View style={styles.timeOptionsContainer}>
          <TouchableOpacity
            style={[
              styles.timeOption,
              timeOption === 'Set Time' && styles.timeOptionActive,
            ]}
          >
            <Icon
              name="time-outline"
              size={24}
              color={timeOption === 'Set Time' ? '#fff' : '#FF8C42'}
            />
            <Text
              style={[
                styles.timeOptionText,
                timeOption === 'Set Time' && styles.timeOptionTextActive,
              ]}
            >
              Set Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeOption,
              timeOption === 'Select Frame' && styles.timeOptionActive,
            ]}
          >
            <Icon
              name="timer-outline"
              size={24}
              color={timeOption === 'Select Frame' ? '#fff' : '#FF8C42'}
            />
            <Text
              style={[
                styles.timeOptionText,
                timeOption === 'Select Frame' && styles.timeOptionTextActive,
              ]}
            >
              Select Frame
            </Text>
          </TouchableOpacity>
        </View>

        {/* Frame Counter - Only show if Select Frame is active */}
        {timeOption === 'Select Frame' && (
          <View style={styles.frameContainer}>
            <Text style={styles.frameLabel}>Frame Count</Text>
            <View style={styles.frameCounterContainer}>
              <TouchableOpacity
                style={styles.frameButton}
                onPress={() => setFrameCount(Math.max(0, frameCount - 1))}
              >
                <Icon name="remove" size={20} color="#FF8C42" />
              </TouchableOpacity>
              <Text style={styles.frameCountText}>{frameCount} frames</Text>
              <TouchableOpacity
                style={styles.frameButton}
                onPress={() => setFrameCount(frameCount + 1)}
              >
                <Icon name="add" size={20} color="#FF8C42" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Food Items */}
        <View style={styles.foodItemsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF8C42" />
              <Text style={styles.loadingText}>Loading menu items...</Text>
            </View>
          ) : getFilteredMenuItems().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="restaurant-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                No items found in {selectedCategory}
              </Text>
              <Text style={styles.emptySubText}>
                Try selecting a different category
              </Text>
            </View>
          ) : (
            <View style={styles.foodListContainer}>
              {getFilteredMenuItems().map((item, index) => {
                const billItem = billItems.find(bi => bi.id === item.id);
                const imageUrl = getMenuImageUrl(item.imageUrl || item.imageurl);
                return (
                  <View key={item.id || index} style={styles.foodCard}>
                    {/* Food Image */}
                    <View style={styles.foodImageContainer}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.foodImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.foodImagePlaceholder}>
                          <Text style={styles.foodEmoji}>
                            {item.category === 'Beverages'
                              ? '🥤'
                              : item.category === 'Fast Food'
                              ? '🍔'
                              : '🍽️'}
                          </Text>
                        </View>
                      )}
                      {/* Veg/Non-veg indicator */}
                      <View
                        style={[
                          styles.vegIndicator,
                          { borderColor: '#0F8A0F' },
                        ]}
                      >
                        <View
                          style={[
                            styles.vegDot,
                            { backgroundColor: '#0F8A0F' },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Food Details */}
                    <View style={styles.foodCardContent}>
                      <View style={styles.foodCardHeader}>
                        <Text style={styles.foodCardName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.description && (
                          <Text
                            style={styles.foodCardDescription}
                            numberOfLines={2}
                          >
                            {item.description}
                          </Text>
                        )}
                      </View>

                      <View style={styles.foodCardFooter}>
                        <Text style={styles.foodCardPrice}>
                          ₹{item.price || 0}
                        </Text>

                        {/* Add/Quantity Controls */}
                        {billItem ? (
                          <View style={styles.quantityControlsCompact}>
                            <TouchableOpacity
                              style={styles.quantityBtnCompact}
                              onPress={() => handleRemoveFromBill(item.id)}
                            >
                              <Icon name="remove" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.quantityTextCompact}>
                              {billItem.quantity}
                            </Text>
                            <TouchableOpacity
                              style={styles.quantityBtnCompact}
                              onPress={() => handleAddToBill(item)}
                            >
                              <Icon name="add" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addBtnCompact}
                            onPress={() => handleAddToBill(item)}
                          >
                            <Text style={styles.addBtnText}>ADD</Text>
                            <View style={styles.addBtnPlus}>
                              <Icon name="add" size={12} color="#FF8C42" />
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Comprehensive Bill Summary */}
        {(totalDurationSeconds > 0 || billItems.length > 0) && (
          <View style={styles.billSummaryContainer}>
            <Text style={styles.billSummaryTitle}>Current Bill Preview</Text>

            {/* Table Charges */}
            {totalDurationSeconds > 0 && (
              <View style={styles.billSection}>
                <Text style={styles.billSectionTitle}>Table Charges</Text>
                <View style={styles.billItem}>
                  <Text style={styles.billItemName}>
                    {gameType || 'Gaming'} - {table?.name} (
                    {Math.ceil(totalDurationSeconds / 60)} min)
                  </Text>
                  <Text style={styles.billItemPrice}>
                    ₹{tableCharges.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* Menu Charges */}
            {billItems.length > 0 && (
              <View style={styles.billSection}>
                <Text style={styles.billSectionTitle}>Menu Items</Text>
                {billItems.map((item, index) => (
                  <View key={item.id || index} style={styles.billItem}>
                    <View style={styles.billItemNameContainer}>
                      <Text style={styles.billItemName}>
                        {item.name} x{item.quantity}
                      </Text>
                      {item.fromPreBooking && (
                        <Text style={styles.preBookingBadge}>Pre-Booked</Text>
                      )}
                      {item.fromExistingOrder && (
                        <Text style={styles.existingOrderBadge}>
                          Already Ordered
                        </Text>
                      )}
                    </View>
                    <Text style={styles.billItemPrice}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={styles.billSubtotal}>
                  <Text style={styles.billSubtotalText}>
                    Menu Subtotal: ₹{menuCharges.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* Total */}
            <View style={styles.billTotal}>
              <Text style={styles.billTotalText}>
                Total Amount: ₹{totalBill.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity
          style={[
            styles.generateBillButton,
            (totalBill < 0 || isCalculatingBill || (isStopwatchMode && elapsedSeconds < 60)) &&
              styles.generateBillButtonDisabled,
          ]}
          onPress={totalBill > 0 ? handleGenerateBill : handleShowBillPreview}
          disabled={isCalculatingBill || (isStopwatchMode && elapsedSeconds < 60)}
        >
          <Text style={styles.generateBillButtonText}>
            {isCalculatingBill 
              ? 'Creating Bill...' 
              : isStopwatchMode && elapsedSeconds < 60
                ? `Wait ${60 - elapsedSeconds}s`
                : 'Generate & Pay Bill'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bill Preview Modal - Replaced with Absolute View */}
      {showBillPreview && (
        <View
          style={[
            styles.modalOverlay,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              elevation: 10,
            },
          ]}
        >
          <View style={styles.billPreviewModal}>
            <View style={styles.billPreviewHeader}>
              <Text style={styles.billPreviewTitle}>Final Bill Preview</Text>
              <TouchableOpacity onPress={() => setShowBillPreview(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.billPreviewContent}>
              <View style={styles.billPreviewSection}>
                <Text style={styles.billPreviewCustomer}>
                  Customer: Walk-in Customer
                </Text>
                <Text style={styles.billPreviewTable}>
                  Table: {table?.name}
                </Text>
                <Text style={styles.billPreviewTime}>
                  Booked Duration: {Math.ceil(totalDurationSeconds / 60)}{' '}
                  minutes
                </Text>
                <Text style={styles.billPreviewTime}>
                  Time Remaining: {formatCountdownTime(remainingSeconds)}
                </Text>
              </View>

              {tableCharges > 0 && (
                <View style={styles.billPreviewSection}>
                  <Text style={styles.billPreviewSectionTitle}>
                    Table Charges
                  </Text>
                  <View style={styles.billPreviewItem}>
                    <Text style={styles.billPreviewItemName}>
                      {gameType} Session ({Math.ceil(totalDurationSeconds / 60)}{' '}
                      min)
                    </Text>
                    <Text style={styles.billPreviewItemPrice}>
                      ₹{tableCharges.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {billItems.length > 0 && (
                <View style={styles.billPreviewSection}>
                  <Text style={styles.billPreviewSectionTitle}>Menu Items</Text>
                  {billItems.map((item, index) => (
                    <View key={index} style={styles.billPreviewItem}>
                      <Text style={styles.billPreviewItemName}>
                        {item.name} × {item.quantity}
                      </Text>
                      <Text style={styles.billPreviewItemPrice}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.billPreviewTotal}>
                <Text style={styles.billPreviewTotalText}>
                  Total Amount: ₹{totalBill.toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.billPreviewActions}>
              <TouchableOpacity
                style={styles.billPreviewCancelButton}
                onPress={() => setShowBillPreview(false)}
              >
                <Text style={styles.billPreviewCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.billPreviewConfirmButton}
                onPress={handleGenerateBill}
                disabled={isCalculatingBill}
              >
                <Text style={styles.billPreviewConfirmText}>
                  {isCalculatingBill
                    ? 'Creating...'
                    : 'Confirm & Generate Bill'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header - Professional Look
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },

  // Content Area
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Table Badge - Prominent
  tableBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tableName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Timer Container - Focus Element
  timerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  timerContainerWarning: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  timerLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: 2,
  },
  timerValueWarning: {
    color: '#FFA500',
  },
  timerValueExpired: {
    color: '#FF4444',
  },
  timerValueStopwatch: {
    color: '#2196F3',
  },
  // Frame mode styles
  frameDisplay: {
    alignItems: 'center',
    marginVertical: 10,
  },
  frameCountLarge: {
    fontSize: 64,
    fontWeight: '800',
    color: '#4CAF50',
    lineHeight: 70,
  },
  frameCountLabel: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
  },
  frameControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  frameControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5EE',
    borderWidth: 2,
    borderColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  timerDurationInfo: {
    fontSize: 13,
    color: '#999999',
    marginTop: 10,
    fontWeight: '500',
  },
  timerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerStatusText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },

  // Time Options Card
  timeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  timeOption: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    minWidth: 90,
  },
  timeOptionActive: {
    backgroundColor: '#FF8C42',
  },
  timeOptionText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 6,
    fontWeight: '600',
  },
  timeOptionTextActive: {
    color: '#FFFFFF',
  },

  // Frame Counter
  frameContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  frameLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    fontWeight: '600',
  },
  frameCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  frameButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  frameCountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 100,
    textAlign: 'center',
  },

  // Categories (Swiggy Style Pills)
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#FFF5EE',
    borderColor: '#FF8C42',
  },
  categoryText: {
    fontSize: 13,
    color: '#696969',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FF8C42',
    fontWeight: '600',
  },

  // Food Items List
  foodItemsContainer: {
    marginBottom: 24,
  },
  // Food List Layout (Zomato/Swiggy Style)
  foodListContainer: {
    gap: 12,
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  foodImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  foodImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodEmoji: {
    fontSize: 36,
  },
  vegIndicator: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  foodCardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  foodCardHeader: {
    flex: 1,
  },
  foodCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  foodCardDescription: {
    fontSize: 12,
    color: '#93959F',
    lineHeight: 16,
  },
  foodCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  foodCardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  // Compact Add Button (Swiggy Style)
  addBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    position: 'relative',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C42',
    letterSpacing: 0.5,
  },
  addBtnPlus: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quantity Controls (Swiggy Style)
  quantityControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityBtnCompact: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityTextCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 24,
    textAlign: 'center',
  },

  // Update Button Styles
  updateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF8C42',
  },
  generateBillButton: {
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  generateBillButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  emptyText: {
    fontSize: 17,
    color: '#333333',
    marginTop: 16,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 15,
    color: '#888888',
    marginTop: 8,
    fontWeight: '500',
  },

  // Quantity Controls
  quantityContainer: {
    marginTop: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF8C42',
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  quantityText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    minWidth: 40,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Update Button Styles
  updateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF8C42',
  },
  generateBillButton: {
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  generateBillButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Bill Summary Card
  billSummaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  billSummaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  billItemNameContainer: {
    flex: 1,
  },
  billItemName: {
    fontSize: 14,
    color: '#666666',
  },
  existingOrderBadge: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  preBookingBadge: {
    fontSize: 10,
    color: '#FF8C42',
    fontWeight: '600',
    marginTop: 2,
  },
  billItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  billTotal: {
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  billTotalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF8C42',
    textAlign: 'center',
  },
  billSection: {
    marginBottom: 16,
  },
  billSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billSubtotal: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 10,
    marginTop: 10,
  },
  billSubtotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'right',
  },
  // Fixed Bottom Container
  fixedBottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Session Action Buttons
  generateBillButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  billPreviewModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 420,
  },
  billPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  billPreviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  billPreviewContent: {
    padding: 20,
    maxHeight: 400,
  },
  billPreviewSection: {
    marginBottom: 20,
  },
  billPreviewCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  billPreviewTable: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  billPreviewTime: {
    fontSize: 14,
    color: '#666',
  },
  billPreviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 4,
  },
  billPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  billPreviewItemName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  billPreviewItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  billPreviewTotal: {
    borderTopWidth: 2,
    borderTopColor: '#FF8C42',
    paddingTop: 16,
    marginTop: 16,
  },
  billPreviewTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
    textAlign: 'center',
  },
  billPreviewActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  billPreviewCancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
    marginRight: 8,
  },
  billPreviewCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  billPreviewConfirmButton: {
    flex: 2,
    backgroundColor: '#FF8C42',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  billPreviewConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
