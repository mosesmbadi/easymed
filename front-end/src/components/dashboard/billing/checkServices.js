import React, { useState } from "react";
import Appointments from "./appointments";
import LabRequests from "./lab-requests";
import Drugs from "./drugs";
import { useSelector } from "react-redux";

const PatientCheckServices = () => {
  const { patientAppointment, patientLabRequest, patientPrescribedDrug } =
    useSelector((store) => store.billing);


  return (
    <section className="flex items-stretch gap-4 bg-background p-2">
      <div className="w-4/12">
        <h1 className="text-center text-sm">Appointment</h1>
        <section>
          {patientAppointment?.length > 0 ? (
            patientAppointment.map((item, index) => (
              <Appointments key={index} {...{ item }} />
            ))
          ) : (
            <p className="text-xs my-8 text-center text-warning">
              No appointments available
            </p>
          )}
        </section>
      </div>
      <div className="w-4/12">
        <h1 className="text-center text-sm">Lab Test Request</h1>
        <section>
          {patientLabRequest?.length > 0 ? (
            patientLabRequest.map((item, index) => (
              <LabRequests key={index} {...{ item }} />
            ))
          ) : (
            <p className="text-xs my-8 text-center text-warning">
              No Lab Requests available
            </p>
          )}
        </section>
      </div>
      <div className="w-4/12">
        <h1 className="text-center text-sm">Prescribed Drug</h1>
        <section>
          {patientPrescribedDrug?.length > 0 ? (
            patientPrescribedDrug.map((item, index) => (
              <Drugs key={index} {...{ item }} />
            ))
          ) : (
            <p className="text-xs my-8 text-center text-warning">
              No Prescribed Drugs available
            </p>
          )}
        </section>
      </div>
    </section>
  );
};

export default PatientCheckServices;
