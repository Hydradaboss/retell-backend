// import { contactModel, jobModel } from "../contacts/contact_model";
// import { v4 as uuidv4 } from "uuid";
// import { callstatusenum, jobstatus } from "../utils/types";
// import schedule from "node-schedule";
// import Retell from "retell-sdk";
// import moment from "moment-timezone";
// //import { searchAndRecallContacts } from "./searchAndRecallContact";
// import { DailyStatsModel } from "../contacts/call_log";
// import { formatPhoneNumber } from "../helper-fuction/formatter";

// const retellClient = new Retell({
//   apiKey: process.env.RETELL_API_KEY,
// });

// export const scheduleCronJob = async (
//   scheduledTimePST: Date,
//   agentId: string,
//   limit: string,
//   fromNumber: string,
//   formattedDate: string,
//   lowerCaseTag?: string,
// ) => {
//   const jobId = uuidv4();
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const todayString = today.toISOString().split("T")[0];

//   try {
//     await DailyStatsModel.create({
//       day: todayString,
//       agentId: agentId,
//       jobProcessedBy: jobId,
//     });
//     const existingJob = await jobModel.findOne({
//       agentId,
//       tagProcessedFor: lowerCaseTag,
//       callstatus: { $in: [jobstatus.ON_CALL, jobstatus.QUEUED] },
//       shouldContinueProcessing: true,
//     });

//     if (existingJob) {
//       console.log(
//         `A job is already running for agent: ${agentId} and tag: ${lowerCaseTag}.`,
//       );
//       return { message: "Job already running", jobId: existingJob.jobId };
//     }
//     const CUTOFF_HOUR = 14;
//     const CUTOFF_MINUTE = 59;
//     await jobModel.create({
//       callstatus: jobstatus.QUEUED,
//       jobId,
//       agentId,
//       scheduledTime: formattedDate,
//       shouldContinueProcessing: true,
//       tagProcessedFor: lowerCaseTag,
//     });

//     const contactLimit = parseInt(limit);
//     const contacts = await contactModel
//       .find({
//         agentId,
//         status: callstatusenum.NOT_CALLED,
//         isDeleted: false,
//         ...(lowerCaseTag ? { tag: lowerCaseTag } : {}),
//         isOnDNCList: false,
//       })
//       .limit(contactLimit)
//       .sort({ createdAt: "desc" });

//     const job = schedule.scheduleJob(jobId, scheduledTimePST, async () => {
//       try {
//         let currentJob = await jobModel.findOneAndUpdate(
//           { jobId },
//           { callstatus: jobstatus.ON_CALL },
//           { new: true },
//         );

//         const contactLimit = parseInt(limit);
//         const contactss = await contactModel
//           .find({
//             agentId,
//             status: callstatusenum.NOT_CALLED,
//             isDeleted: false,
//             ...(lowerCaseTag ? { tag: lowerCaseTag } : {}),
//           })
//           .limit(contactLimit)
//           .sort({ createdAt: "desc" });
//           const totalNumberOfContactToBeProcessed = contactss.length
//           await jobModel.findOne({jobId}, {totalContactToProcess: contactss.length})
//         for (const contact of contactss) {
//           currentJob = await jobModel.findOne({ jobId });

//           const now = moment().tz("America/Los_Angeles");
//           if (
//             now.hour() > CUTOFF_HOUR ||
//             (now.hour() === CUTOFF_HOUR && now.minute() >= CUTOFF_MINUTE)
//           ) {
//             console.log(
//               "Job processing stopped due to time cutoff (9:45 PST).",
//             );
//             await jobModel.findOneAndUpdate(
//               { jobId },
//               { callstatus: "cancelled", shouldContinueProcessing: false },
//             );
//             break;
//           }

//           if (!currentJob || currentJob.shouldContinueProcessing === false) {
//             console.log("Job processing stopped by user flag.");
//             await jobModel.findOneAndUpdate(
//               { jobId },
//               { callstatus: "cancelled", shouldContinueProcessing: false },
//             );
//             break;
//           }

//           const postdata = {
//             fromNumber,
//             toNumber: contact.phone,
//             userId: contact._id.toString(),
//             agentId,
//           };

//           try {
//             await retellClient.call.registerPhoneCall({
//               agent_id: agentId,
//               from_number: fromNumber,
//               to_number: formatPhoneNumber(postdata.toNumber),
//               retell_llm_dynamic_variables: {
//                 user_firstname: contact.firstname,
//                 user_email: contact.email,
//                 user_lasname: contact.lastname,
//                 job_id: jobId,
//               },
//             });

//             const registerCallResponse2 =
//               await retellClient.call.createPhoneCall({
//                 from_number: fromNumber,
//                 to_number: formatPhoneNumber(postdata.toNumber),
//                 override_agent_id: agentId,
//                 retell_llm_dynamic_variables: {
//                   user_firstname: contact.firstname,
//                   user_email: contact.email,
//                   user_lasname: contact.lastname,
//                   job_id: jobId,
//                 },
//               });

//             await contactModel.findByIdAndUpdate(contact._id, {
//               callId: registerCallResponse2.call_id,
//               $push: { jobProcessedWithId: jobId },
//               isusercalled: true,
//             });

//             const currentPercentage = (currentJob.processedContacts / totalNumberOfContactToBeProcessed ) * 100
//             await jobModel.findOneAndUpdate(
//               { jobId },
//               { $inc: { processedContacts: 1 } ,
//             completedPercent: currentPercentage},
//             );
//             console.log(`Call successful for contact: ${contact.firstname}`);
//           } catch (error) {
//             console.log("Error during call processing:", error);
//           }
//           await new Promise((resolve) => setTimeout(resolve, 4000));
//         }

//         await jobModel.findOneAndUpdate(
//           { jobId },
//           { callstatus: jobstatus.CALLED, shouldContinueProcessing: false },
//         );
//       } catch (error) {
//         console.error("Error in job processing:", error);
//       }
//     });

//     console.log(
//       `Job scheduled with ID: ${jobId}, Next scheduled run: ${job.nextInvocation()}`,
//     );
//     return { jobId, scheduledTime: scheduledTimePST, contacts };
//   } catch (error) {
//     console.error("Error scheduling job:", error);
//     throw error;
//   }
// };

import { contactModel, jobModel } from "../contacts/contact_model";
import { v4 as uuidv4 } from "uuid";
import { callstatusenum, jobstatus } from "../utils/types";
import schedule from "node-schedule";
import Retell from "retell-sdk";
import moment from "moment-timezone";
import { DailyStatsModel } from "../contacts/call_log";
import { formatPhoneNumber } from "../helper-fuction/formatter";

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY,
});

export const scheduleCronJob = async (
  scheduledTimePST: Date,
  agentId: string,
  limit: string,
  fromNumber: string,
  formattedDate: string,
  lowerCaseTag: string,
) => {
  const jobId = uuidv4();
  const todayString = new Date().toISOString().split("T")[0];

  try {
    await DailyStatsModel.create({
      day: todayString,
      agentId,
      jobProcessedBy: jobId,
    });

    const existingJob = await jobModel.findOne({
      agentId,
      tagProcessedFor: lowerCaseTag,
      callstatus: { $in: [jobstatus.ON_CALL, jobstatus.QUEUED] },
      shouldContinueProcessing: true,
    });

    if (existingJob) {
      console.log(
        `A job is already running for agent: ${agentId} and tag: ${lowerCaseTag}.`,
      );
      return { message: "Job already running", jobId: existingJob.jobId };
    }

    const CUTOFF_HOUR = 14;
    const CUTOFF_MINUTE = 59;

    await jobModel.create({
      callstatus: jobstatus.QUEUED,
      jobId,
      agentId,
      scheduledTime: formattedDate,
      shouldContinueProcessing: true,
      tagProcessedFor: lowerCaseTag,
    });

    
    const contactLimit = limit ? parseInt(limit) : null;
    const contacts = await contactModel
      .find({
        agentId,
        status: callstatusenum.NOT_CALLED,
        isDeleted: false,
        ...(lowerCaseTag ? { tag: lowerCaseTag } : {}),
        isOnDNCList: false,
      })
      .limit(contactLimit)
      .sort({ createdAt: "desc" });

    const job = schedule.scheduleJob(jobId, scheduledTimePST, async () => {
      try {
        let currentJob = await jobModel.findOneAndUpdate(
          { jobId },
          { callstatus: jobstatus.ON_CALL },
          { new: true },
        );

        const totalContacts = await contactModel
          .countDocuments({
            agentId,
            status: callstatusenum.NOT_CALLED,
            isDeleted: false,
            ...(lowerCaseTag ? { tag: lowerCaseTag } : {}),
            isOnDNCList: false,
          })
          .limit(contactLimit);

        // Log the query and the result
        console.log("Query for total contacts:", {
          agentId,
          status: callstatusenum.NOT_CALLED,
          isDeleted: false,
          ...(lowerCaseTag ? { tag: lowerCaseTag } : {}),
          isOnDNCList: false,
        });
        console.log("Total contacts found:", totalContacts);

        await jobModel.findOneAndUpdate(
          { jobId },
          { totalContactToProcess: totalContacts },
        );

        for (const contact of contacts) {
          
          currentJob = await jobModel.findOne({ jobId });
          const now = moment().tz("America/Los_Angeles");

          // Time cutoff check
          if (
            now.hour() > CUTOFF_HOUR ||
            (now.hour() === CUTOFF_HOUR && now.minute() >= CUTOFF_MINUTE)
          ) {
            console.log(
              "Job processing stopped due to time cutoff (9:45 PST).",
            );
            await jobModel.updateOne(
              { jobId },
              { callstatus: "cancelled", shouldContinueProcessing: false },
            );
            break;
          }

          if (!currentJob || currentJob.shouldContinueProcessing === false) {
            console.log("Job processing stopped by user flag.");
            await jobModel.updateOne(
              { jobId },
              { callstatus: "cancelled", shouldContinueProcessing: false },
            );
            break;
          }

          try {
            const postdata = {
              fromNumber,
              toNumber: contact.phone,
              userId: contact._id.toString(),
              agentId,
            };

             await retellClient.call.registerPhoneCall({
              agent_id: agentId,
              from_number: fromNumber,
              to_number: formatPhoneNumber(postdata.toNumber),
              retell_llm_dynamic_variables: {
                user_firstname: contact.firstname,
                user_email: contact.email,
                user_lastname: contact.lastname,
                job_id: jobId,
              },
            });

            const registerCallResponse = await retellClient.call.createPhoneCall({
              from_number: fromNumber,
              to_number: formatPhoneNumber(postdata.toNumber),
              override_agent_id: agentId,
              retell_llm_dynamic_variables: {
                user_firstname: contact.firstname,
                user_email: contact.email,
                user_lastname: contact.lastname,
                job_id: jobId,
              },
            });

            await contactModel.findByIdAndUpdate(contact._id, {
              callId: registerCallResponse.call_id,
              $push: { jobProcessedWithId: jobId },
              isusercalled: true,
            });

            const updatedProcessedContacts = currentJob.processedContacts + 1;
            const currentPercentage =
              (updatedProcessedContacts / totalContacts) * 100;

            await jobModel.findOneAndUpdate(
              { jobId },
              {
                $inc: { processedContacts: 1 },
                completedPercent: currentPercentage,
              },
            );
            console.log(`Call successful for contact: ${contact.firstname}`);
          } catch (error) {
            console.log("Error during call processing:", error);
          }
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }

        await jobModel.findOneAndUpdate(
          { jobId },
          { callstatus: jobstatus.CALLED, shouldContinueProcessing: false },
        );
      } catch (error) {
        console.error("Error in job processing:", error);
      }
    });

    console.log(
      `Job scheduled with ID: ${jobId}, Next scheduled run: ${job.nextInvocation()}`,
    );
    return { jobId, scheduledTime: scheduledTimePST, contacts };
  } catch (error) {
    console.error("Error scheduling job:", error);
    throw error;
  }
};
