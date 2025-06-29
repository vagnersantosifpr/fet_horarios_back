const express = require('express');
const router = express.Router();
const Discipline = require('../models/discipline.model');
const Timetable = require('../models/timetable.model');

// Get all disciplines
router.get('/disciplines', async (req, res) => {
  try {
    const disciplines = await Discipline.find();
    res.json(disciplines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get timetable for a specific turma and semester
router.get('/timetable/:turmaCode/:semester', async (req, res) => {
  try {
    const { turmaCode, semester } = req.params;
    const timetable = await Timetable.findOne({ turmaCode, semester });

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found for this turma and semester.' });
    }

    // Populate discipline details if needed (optional, frontend can map IDs)
    // const populatedSchedule = {};
    // for (const slot in timetable.schedule) {
    //     const disciplineId = timetable.schedule.get(slot); // Use .get() for Map
    //     if (disciplineId) {
    //         const discipline = await Discipline.findOne({ id: disciplineId });
    //         populatedSchedule[slot] = discipline; // Or just the ID
    //     } else {
    //         populatedSchedule[slot] = null;
    //     }
    // }

    // Sending the schedule map directly for simplicity, frontend uses disciplineMap
    res.json(timetable);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update timetable for a specific turma and semester
// Expects body: { schedule: { "slotId": "disciplineId", ... } }
router.put('/timetable/:turmaCode/:semester', async (req, res) => {
    // <<< REPLACED ALERT LOGIC WITH ACTUAL DB SAVE >>>
    try {
        const { turmaCode, semester } = req.params;
        const updatedSchedule = req.body.schedule; // Expect the entire schedule map

        const timetable = await Timetable.findOne({ turmaCode, semester });

        if (!timetable) {
             return res.status(404).json({ message: 'Timetable not found for this turma and semester.' });
        }

        // Update the schedule map
        timetable.schedule = updatedSchedule;

        // Save the updated timetable
        await timetable.save();

        res.json({ message: 'Timetable updated successfully!', timetable });

    } catch (err) {
        console.error('Error saving timetable:', err);
        res.status(500).json({ message: 'Failed to update timetable.', error: err.message });
    }
});


module.exports = router;