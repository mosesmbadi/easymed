import React from 'react'
import Link from 'next/link'
import { Grid, Paper } from '@mui/material'

const ChannelCards = ({channel}) => {
  const columnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding:10,
    textAlign: 'center',
    color: 'black',
    background: 'white',
    borderRadius: 10,
    height: '100px',
    cursor:"pointer",
  };


  return (
    <Grid item xs={6}>
      <Link href={`/dashboard/announcements/channel/${channel.name}`} >
        <Paper style={columnStyle}>
          <img className="h-full w-100px" src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt={channel.name}></img>
          <div className="w-full">
            <p>{channel.name}</p>
          </div>
        </Paper>
      </Link>
  </Grid>
  )
}

export default ChannelCards