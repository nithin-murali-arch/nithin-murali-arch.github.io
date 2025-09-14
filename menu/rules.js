const RULES = [
    // High-priority rules are applied first to lock in key constraints for the week.
    { 
        type: 'FORCE_DISH_ON_DAY', 
        main: 'Godhuma Rava Upma', 
        day: 'any', // Can be any day from Mon-Fri
        frequency: 'weekly', // Must appear once per week
        priority: 100 
    },
    { 
        type: 'FORCE_CATEGORY_ON_DAY', 
        category: 'Bread', 
        day: 6, // 6 corresponds to Saturday
        priority: 90 
    },

    // Mid-priority rules define specific meal and side dish pairings.
    { 
        type: 'FORCE_SIDE', 
        main: 'Arisi Upma', 
        side: 'Vathakuzhambu and Coconut Chutney', 
        priority: 80 
    },
    { 
        type: 'AVOID_SIDE_PAIRING', 
        main: 'Aloo Paratha', 
        invalidSides: ['Aloo Masala', 'Jeera Aloo'], 
        priority: 70 
    },

    // Low-priority rules handle value-added tasks like making prep items.
    { 
        type: 'FORCE_PREP_TASK', 
        side_includes: 'Coconut Chutney', 
        task_type: 'Thokku', 
        priority: 60 
    },
    { 
        type: 'NO_PREP_ON_CATEGORY', 
        category: 'Bread', 
        priority: 50 
    }
];