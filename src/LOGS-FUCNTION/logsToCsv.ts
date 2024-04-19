import { createObjectCsvWriter } from "csv-writer";
import { contactModel } from "../contacts/contact_model";
import path from "path"
export const logsToCsv = async (agentId: string, newlimit: number) => {
    try {
        const foundContacts = await contactModel
          .find({ agentId, isDeleted: { $ne: true } })
          .sort({ createdAt: "desc" })
          .populate("referenceToCallId")
          .limit(newlimit);

        // Extract relevant fields from found contacts
        const contactsData = foundContacts.map((contact) => ({
          name: contact.firstname,
          email: contact.email,
          phone: contact.phone,
          status: contact.status,
          transcript: contact.referenceToCallId?.transcript || "",
        }));

        // Write contacts data to CSV file
        const filePath = path.join(__dirname, "..", "public", "logs.csv");
        console.log("File path:", filePath); // Log file path for debugging

        const csvWriter = createObjectCsvWriter({
          path: filePath,
          header: [
            { id: "name", title: "Name" },
            { id: "email", title: "Email" },
            { id: "phone", title: "Phone Number" },
            { id: "status", title: "Status" },
            { id: "transcript", title: "Transcript" },
          ],
        });

        await csvWriter.writeRecords(contactsData);
        console.log("CSV file logs.csv has been written successfully");
        return filePath
      } catch (error) {
        console.error(`Error retrieving contacts: ${error}`);
        return error
      }
}