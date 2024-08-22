import axios, { AxiosError, AxiosResponse } from "axios";

let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

export async function generateZoomAccessToken(
  clientId: string,
  clientSecret: string,
  accountId: string,
): Promise<void> {
  const credentials = `${clientId}:${clientSecret}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${encodedCredentials}`,
  };

  const body = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: accountId,
  });

  try {
    const response: AxiosResponse = await axios.post(
      "https://zoom.us/oauth/token",
      body,
      { headers },
    );
    accessToken = response.data.access_token;
    console.log(accessToken)
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000;
    console.log("Access token generated successfully");
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
}
async function refreshTokenIfNeeded(
  clientId: string,
  clientSecret: string,
  accountId: string,
): Promise<void> {
  if (
    !accessToken ||
    (tokenExpiryTime && Date.now() > tokenExpiryTime - 5 * 60 * 1000)
  ) {
    // 5 minutes before expiration
    console.log(
      "Token is nearing expiration or not available, refreshing token...",
    );
    await generateZoomAccessToken(clientId, clientSecret, accountId);
  }
}
export async function getUserId(
  email: string,
  clientId: string,
  clientSecret: string,
  accountId: string,
): Promise<string> {
  await refreshTokenIfNeeded(clientId, clientSecret, accountId);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const response: AxiosResponse = await axios.get(
      `https://api.zoom.us/v2/users/${email}`,
      { headers },
    );
    const userId = response.data.id;
    return userId;
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
}
interface Segment {
  start: string;
  end: string;
}
interface SegmentsRecurrence {
  [day: string]: Segment[];
}
const dayNames: Record<string, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday'
};
// Function to handle Axios errors
function handleAxiosError(error: unknown): void {
  if (axios.isAxiosError(error)) {
    console.error("Error:", error.response?.data || error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
export async function checkAvailability(
  clientId: string,
  clientSecret: string,
  accountId: string,
  availabilityId: string
): Promise<Record<string, string>> {
  await refreshTokenIfNeeded(clientId, clientSecret, accountId);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const response: AxiosResponse<{
      segments_recurrence: SegmentsRecurrence;
    }> = await axios.get(
      `https://api.zoom.us/v2/scheduler/availability/${availabilityId}`,
      { headers }
    );

    const segmentsRecurrence = response.data.segments_recurrence;

    // Transform the data into the desired format
    const availableTimes: Record<string, string> = {};
    for (const [shortDay, segments] of Object.entries(segmentsRecurrence)) {
      if (Array.isArray(segments) && segments.length > 0) {
        // Use the full name of the day
        const fullDayName = dayNames[shortDay];
        if (fullDayName) {
          availableTimes[fullDayName] = segments[0].start;
        }
      }
    }
    return availableTimes;
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
}
// Function to schedule a meeting
export async function scheduleMeeting(
  clientId: string,
  clientSecret: string,
  accountId: string,
  userId: string,
  startTime: string,
  duration: number,
  topic: string,
  agenda: string,
  invitee: string
): Promise<any> {
  await refreshTokenIfNeeded(clientId, clientSecret, accountId);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const meetingDetails = {
    topic: topic,
    type: 2, 
    start_time: startTime,
    duration: duration,
    timezone: 'UTC',
    agenda: agenda,
    meeting_invitees:[{email:invitee}]

  };

  try {
    const response: AxiosResponse = await axios.post(
      `https://api.zoom.us/v2/users/${userId}/meetings`,
      meetingDetails,
      { headers }
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
}