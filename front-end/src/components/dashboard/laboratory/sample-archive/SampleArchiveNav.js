import React, { useState } from 'react';
import PatientSampleArchive from './PatientSampleArchive';
import PatientSampleList from '../PatientSampleList';
import ReleasedSamples from './ReleasedSamples';

const SampleArchiveNav = () => {
    const [currentTab, setCurrentTab] = useState(0);

    return (
        <>
            <section className="mb-2">
                <div className="w-full py-1 px-2 flex items-center gap-4 text-center">
                    <div>
                        <p
                            className={`${currentTab === 0
                                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                                : "cursor-pointer text-center p-4"
                                } `}
                            onClick={() => setCurrentTab(0)}
                        >
                            Patient Sample
                        </p>
                    </div>

                    <div>
                        <p
                            className={`${currentTab === 1
                                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                                : "cursor-pointer text-center p-4"
                                } `}
                            onClick={() => setCurrentTab(1)}
                        >
                            Archive Sample
                        </p>
                    </div>

                    <div>
                        <p
                            className={`${currentTab === 2
                                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                                : "cursor-pointer text-center p-4"
                                } `}
                            onClick={() => setCurrentTab(2)}
                        >
                            Released Sample
                        </p>
                    </div>
                </div>
            </section>

            <div className="mt-2">
                {currentTab === 0 && <PatientSampleList />}
                {currentTab === 1 && <PatientSampleArchive />}
                {currentTab === 2 && <ReleasedSamples />}
            </div>
        </>
    );
};

export default SampleArchiveNav;
