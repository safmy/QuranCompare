import { supabase } from './supabase';

// Cancel subscription in Supabase
export const cancelSubscription = async (userId) => {
  try {
    // Update user's subscription status
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
        subscription_end_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Log cancellation event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'cancelled',
        event_date: new Date().toISOString(),
        metadata: {
          cancelled_by: 'user',
          reason: 'user_requested'
        }
      });

    return { success: true, data };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: error.message };
  }
};

// Check if user has premium status (alias for compatibility)
export const checkPremiumStatus = async (userId) => {
  const result = await checkSubscriptionStatus(userId);
  return result.isActive || false;
};

// Check if user has active subscription
export const checkSubscriptionStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_end_date')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const isActive = data?.subscription_status === 'active' && 
                    (!data?.subscription_end_date || new Date(data.subscription_end_date) > new Date());

    return { 
      success: true, 
      isActive,
      status: data?.subscription_status,
      endDate: data?.subscription_end_date
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { success: false, error: error.message };
  }
};

// Renew subscription
export const renewSubscription = async (userId, duration = 30) => {
  try {
    const currentDate = new Date();
    const endDate = new Date();
    endDate.setDate(currentDate.getDate() + duration);

    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_start_date: currentDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        updated_at: currentDate.toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Log renewal event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'renewed',
        event_date: currentDate.toISOString(),
        metadata: {
          duration_days: duration,
          end_date: endDate.toISOString()
        }
      });

    return { success: true, data, endDate };
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return { success: false, error: error.message };
  }
};