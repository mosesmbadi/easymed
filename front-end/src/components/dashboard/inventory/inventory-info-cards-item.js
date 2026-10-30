import React from 'react'
import { Grid, Paper } from "@mui/material";

export const InventoryInfoCardsItem = ({itemData}) => {
    const columnStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:10,
        textAlign: 'center',
        color: 'black',
        background: 'white',
        borderRadius: 10,
        height: '75px',
        gap: '20px',
    };
  return (
    <Grid item xs={4}>
        <Paper style={columnStyle}>
        <img className="h-8 w-8" src={itemData.icon} alt=""></img>
        <div className="">
            <p>{itemData.label}</p>
            <p>{itemData.figures}</p>
        </div>
        </Paper>
    </Grid>
  )
}