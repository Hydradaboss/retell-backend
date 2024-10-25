import { createObjectCsvWriter } from "csv-writer";
import { contactModel } from "../contacts/contact_model";
import path from "path";
import { callSentimentenum, callstatusenum } from "../utils/types";
import { differenceInDays, addDays } from "date-fns";

export const logsToCsv = async (
  agentId: string,
  newlimit?: number,
  startDate?: string,
  endDate?: string,
  statusOption?: "Called" | "notCalled" | "vm" | "Failed" | "All",
  sentimentOption?:
    | "Not-Interested"
    | "Scheduled"
    | "Call-Back"
    | "Incomplete"
    | "Interested"
    | "Voicemail"
    | "All",
) => {
  try {
    let query: any = {
      isDeleted: false,
    };

    if (agentId) {
      query.agentId = agentId;
    }

    if (statusOption && statusOption !== "All") {
      let callStatus;
      if (statusOption === "Called") {
        callStatus = callstatusenum.CALLED;
      } else if (statusOption === "notCalled") {
        callStatus = callstatusenum.NOT_CALLED;
      } else if (statusOption === "vm") {
        callStatus = callstatusenum.VOICEMAIL;
      } else if (statusOption === "Failed") {
        callStatus = callstatusenum.FAILED;
      }
      query.status = callStatus;
    }

    const formattedStartDate = startDate
      ? new Date(startDate).toISOString().split("T")[0]
      : null;
    const formattedEndDate = endDate
      ? new Date(endDate).toISOString().split("T")[0]
      : null;

    const getDatesInRange = (start: string, end: string): string[] => {
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      const daysDiff = differenceInDays(endDateObj, startDateObj);
      const dates = [];

      for (let i = 0; i <= daysDiff; i++) {
        dates.push(addDays(startDateObj, i).toISOString().split("T")[0]);
      }
      return dates;
    };

    // Filter by date range
    if (formattedStartDate && formattedEndDate) {
      const datesInRange = getDatesInRange(
        formattedStartDate,
        formattedEndDate,
      );
      query["datesCalled"] = { $in: datesInRange };
    } else if (formattedStartDate) {
      query["datesCalled"] = formattedStartDate;
    }

    console.log(query);
    let contactQuery = contactModel
      .find(query)
      .sort({ createdAt: "desc" })
      .select(
        "firstname lastname email phone status referenceToCallId datesCalled",
      )
      .populate(
        "referenceToCallId",
        "transcript analyzedTranscript recordingUrl",
      );

    // Conditionally add limit if provided
    if (newlimit && Number.isInteger(newlimit) && newlimit > 0) {
      contactQuery = contactQuery.limit(newlimit);
    }

    const foundContacts = await contactQuery.exec();
    console.log(foundContacts);

    const filePath = path.join(__dirname, "..", "..", "public", "logs.csv");

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "firstname", title: "firstname" },
        { id: "lastname", title: "lastname" },
        { id: "email", title: "email" },
        { id: "phone", title: "phone" },
        { id: "status", title: "status" },
        { id: "transcript", title: "transcript" },
        { id: "call_recording_url", title: "call_recording_url" },
        { id: "analyzedTranscript", title: "analyzedTranscript" },
        { id: "last_date_called", title: "last_date_called" },
      ],
    });
    let callSentimentStatus: string;
    if (sentimentOption === "Not-Interested") {
      callSentimentStatus = callSentimentenum.NOT_INTERESTED;
    } else if (sentimentOption === "Scheduled") {
      callSentimentStatus = callSentimentenum.SCHEDULED;
    } else if (sentimentOption === "Call-Back") {
      callSentimentStatus = callSentimentenum.CALL_BACK;
    } else if (sentimentOption === "Interested") {
      callSentimentStatus = callSentimentenum.INTERESTED;
    } else if (sentimentOption === "Voicemail") {
      callSentimentStatus = callSentimentenum.VOICEMAIL;
    } else if (sentimentOption === "Incomplete") {
      callSentimentStatus = callSentimentenum.INCOMPLETE_CALL;
    }
    const contactsData = foundContacts
      .map((contact) => ({
        firstname: contact.firstname,
        lastname: contact.lastname,
        email: contact.email,
        phone: contact.phone,
        status: contact.status,
        transcript: contact.referenceToCallId?.transcript,
        call_recording_url: contact.referenceToCallId?.recordingUrl,
        analyzedTranscript: contact.referenceToCallId?.analyzedTranscript,
        last_date_called: contact.datesCalled,
      }))
      .filter((contact) => {
        // If sentimentOption is provided and not "All", filter by analyzedTranscript
        return (
          sentimentOption === "All" ||
          contact.analyzedTranscript === callSentimentStatus
        );
      });

    await csvWriter.writeRecords(contactsData);
    console.log("CSV file logs.csv has been written successfully");
    return filePath;
  } catch (error) {
    console.error(
      `Error generating CSV: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
};
