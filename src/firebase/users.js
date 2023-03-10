import { getDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase-config";
import { getCall } from "./calls";

export const getUser = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // doc.data() will be undefined in this case
      console.log("No such document!");
    }
  } catch (error) {
    console.log(error);
  }
};

export const updateUser = async (uid, data) => {
  try {
    const user = await updateDoc(doc(db, "users", uid), data);
    return user;
  } catch (error) {
    console.log(error);
  }
};

//BEN YAPARIM! buttonunda uid gonderilmiyor cunku user.uid var
//Admin approve/reject ettiginde ise id gonderilmeli
export const updateUserAppliedCalls = async (id, callID, status) => {
  try {
    const userId = id ? id : auth?.currentUser?.uid;

    const user = await getUser(userId);

    const appliedCalls = user?.appliedCalls || [];

    const updatedCalls = appliedCalls.filter((call) => call.id !== callID);

    await updateDoc(doc(db, "users", userId), {
      appliedCalls: [...updatedCalls, { id: callID, status: status }],
    });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getUserAppliedCalls = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));

    if (userDoc.exists()) {
      return userDoc.data().appliedCalls;
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.log(error);
  }
};

export const getUserAppliedCallsData = async (appliedCalls) => {
  return await Promise.all(
    appliedCalls?.map(async (call) => {
      const callData = await getCall(call.id);
      const mergedCalls = { ...callData, ...call };
      return mergedCalls;
    })
  );
};

export const checkUserAppliedCallDates = async (applicantID, proposedCall) => {
  try {
    //We do not need to consider rejected applications
    const userAppliedCallsRef = (
      await getUserAppliedCalls(applicantID)
    )?.filter(function (call) {
      return call.status !== "rejected";
    });

    //Overlapping time intervals are calculated by the following clause
    //(start1 < end2 && start1 > start2) || (start2 < end1 && start2 > start1);
    const userBlockingAppliedCalls = (
      await getUserAppliedCallsData(userAppliedCallsRef)
    )?.filter(function (call) {
      const callStartDate = call?.date?.startDate;
      const callEndDate = call?.date?.endDate;
      const proposedCallStartDate = proposedCall?.date?.startDate;
      const proposedCallEndDate = proposedCall?.date?.endDate;
      return (
        (callStartDate <= proposedCallEndDate &&
          callStartDate >= proposedCallStartDate) ||
        (proposedCallStartDate <= callEndDate &&
          proposedCallStartDate >= callStartDate)
      );
    });
    return userBlockingAppliedCalls.length > 0 ? false : true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
export const getUserAppliedSpecificCall = async (uid, callID) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const appliedCalls = userDoc.data().appliedCalls || [];

      const appliedCall = appliedCalls.find((call) => call.id === callID);
      return appliedCall;
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.log(error);
  }
}

export const revokeAppliedCall = async (uid, callID) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    const callDoc = await getDoc(doc(db, "calls", callID));

    if (userDoc.exists() && callDoc.exists()) {
      const appliedCalls = userDoc.data().appliedCalls || [];
      const callApplicants = callDoc.data().applicants || [];

      const updatedUserCalls = appliedCalls.filter(
        (call) => call.id !== callID
      );
      const updatedCall = callApplicants.filter((call) => call.uid !== uid);

      await updateDoc(doc(db, "users", uid), {
        appliedCalls: [...updatedUserCalls],
      });

      await updateDoc(doc(db, "calls", callID), {
        applicants: [...updatedCall],
      });
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.log(error);
  }
};
