import React, { useState } from 'react';
import Positions from './Positions';
import Sections from './Sections';
import Component from './Component';
import PatientSampleArchive from './PatientSampleArchive';
import Archive from './Archive';
import Racks from './Racks';

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
                            Patient Sample Archive
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
                            Archive
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
                            Component
                        </p>
                    </div>

                    <div>
                        <p
                            className={`${currentTab === 3
                                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                                : "cursor-pointer text-center p-4"
                                } `}
                            onClick={() => setCurrentTab(3)}
                        >
                            Sections
                        </p>
                    </div>

                    <div>
                        <p
                            className={`${currentTab === 4
                                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                                : "cursor-pointer text-center p-4"
                                } `}
                            onClick={() => setCurrentTab(4)}
                        >
                            Racks
                        </p>
                    </div>

                    <div>
                        <p
                            className={`${currentTab === 5
                                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                                : "cursor-pointer text-center p-4"
                                }`}
                            onClick={() => setCurrentTab(5)}
                        >
                            Positions
                        </p>
                    </div>
                </div>
            </section>

            <div className="mt-2">
                {currentTab === 0 && <PatientSampleArchive />}
                {currentTab === 1 && <Archive />}
                {currentTab === 2 && <Component />}
                {currentTab === 3 && <Sections />}
                {currentTab === 4 && <Racks />}
                {currentTab === 5 && <Positions />}
            </div>
        </>
    );
};

export default SampleArchiveNav;
