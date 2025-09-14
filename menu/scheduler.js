// --- Seeded Random Number Generator ---
function createSeededRandom(seed) {
    let state = seed;
    return function() {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

function getMealOptions(mainDish, category, weeklySides, seededRandom) {
    const sideSource = CONFIG.meal_options[category].sides;
    let sideOptions = Array.isArray(sideSource) ? sideSource : (sideSource[mainDish] || []);
    
    if (typeof sideOptions === 'string') { // Fixed sides like for Ven Pongal
        return { main: mainDish, sides: sideOptions.replace(' and ', ',').split(',') };
    }

    const alooRule = RULES.find(r => r.type === 'AVOID_SIDE_PAIRING' && r.main === mainDish);
    if (alooRule) {
        sideOptions = sideOptions.filter(s => !alooRule.invalidSides.includes(s));
    }
    
    const availableSides = sideOptions.filter(s => !weeklySides.has(s));
    const chosenSide = availableSides.length > 0 ? availableSides[Math.floor(seededRandom() * availableSides.length)] : (sideOptions[0] || '');
    
    return { main: mainDish, sides: [chosenSide] };
}

function generateShoppingList(scheduleData) {
    const aggregated_ingredients = {};
    for (const row of scheduleData) {
        let dishes = new Set([row.MainDish, ...row.SideDish.split(' (+ ')[0].replace(' and ', ',').split(',').map(s => s.trim()).filter(Boolean)]);
        if (row.SideDish.includes(' (+ Prep: ')) {
            dishes.add(row.SideDish.split(' (+ Prep: ')[1].replace(')', ''));
        }
        dishes.forEach(dish => {
            (INGREDIENTS_DB[dish] || []).forEach(ing => {
                if (!aggregated_ingredients[ing.name]) {
                    aggregated_ingredients[ing.name] = { qty: 0, unit: ing.unit, category: ing.category };
                }
                aggregated_ingredients[ing.name].qty += ing.qty;
            });
        });
    }
    return aggregated_ingredients;
}


// --- Core Scheduling Logic ---
function generateDinnerSchedule(forYear = false, seed = Date.now()) {
    const seededRandom = createSeededRandom(seed);
    const { meal_options, monthly_limits, easy_dishes_main, easy_dishes_side, prep_tasks } = CONFIG;
    const shuffleArray = (array) => array.slice().sort(() => seededRandom() - 0.5);
    const thokku_tasks = prep_tasks.filter(task => task.includes('Thokku'));

    const today = new Date();
    let startDate = new Date(today);
    if (today.getDay() === 0) startDate.setDate(today.getDate() + 1);
    
    let endDate = forYear ? new Date(startDate.getFullYear(), 11, 31) : new Date(startDate);
    if (!forYear) {
        const daysUntilSaturday = 6 - (startDate.getDay() || 7) + 1;
        endDate.setDate(startDate.getDate() + daysUntilSaturday -1);
    }

    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        if (currentDate.getDay() !== 0) dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const schedule = [];
    let monthlyUsage = {};
    let currentMonth = -1;
    const weekly_template_base = ['Tiffin', 'Pulao', 'Biryani', 'Tiffin', 'Bread'];

    for (let i = 0; i < dates.length; i += 6) {
        const weekly_mains = new Set();
        const weekly_sides = new Set();
        let shuffled_template = shuffleArray(weekly_template_base);
        const current_week_dates = dates.slice(i, i + 6);
        let week_schedule_plan = {};
        
        // --- Apply hard rules first ---
        RULES.filter(r => r.priority >= 90).sort((a,b) => b.priority - a.priority).forEach(rule => {
            if (rule.type === 'FORCE_DISH_ON_DAY') {
                const availableDays = current_week_dates.filter(d => !Object.keys(week_schedule_plan).some(plannedDate => new Date(plannedDate).getTime() === d.getTime()));
                if(availableDays.length > 0) {
                    const day = availableDays[Math.floor(seededRandom() * availableDays.length)];
                    const category = Object.keys(meal_options).find(cat => meal_options[cat].main.includes(rule.main));
                    week_schedule_plan[day] = {category: category, forcedMain: rule.main};
                    shuffled_template.splice(shuffled_template.indexOf(category), 1);
                }
            } else if (rule.type === 'FORCE_CATEGORY_ON_DAY') {
                const day = current_week_dates.find(d => d.getDay() === rule.day);
                if(day && !week_schedule_plan[day]) {
                    week_schedule_plan[day] = rule.category;
                    shuffled_template.splice(shuffled_template.indexOf(rule.category), 1);
                }
            }
        });

        current_week_dates.forEach(day => {
            if (!Object.keys(week_schedule_plan).some(d => new Date(d).getTime() === day.getTime())) {
                week_schedule_plan[day] = shuffled_template.pop() || 'Tiffin'; // Fallback
            }
        });
        
        const sortedDays = Object.keys(week_schedule_plan).sort((a, b) => new Date(a) - new Date(b));

        for (const dtStr of sortedDays) {
            const dt = new Date(dtStr);
            if (dt.getMonth() !== currentMonth) {
                currentMonth = dt.getMonth();
                monthlyUsage = {};
            }

            let category, main_dish;
            const plan = week_schedule_plan[dt];

            if(typeof plan === 'object'){
                category = plan.category;
                main_dish = plan.forcedMain;
            } else {
                category = plan;
                let availableMains = meal_options[category].main.filter(main => (monthlyUsage[main] || 0) < (monthly_limits[main] || Infinity) && !weekly_mains.has(main));
                if (availableMains.length === 0) availableMains = meal_options[category].main.filter(m => !weekly_mains.has(m));
                if (availableMains.length === 0) availableMains = meal_options[category].main;
                main_dish = availableMains[Math.floor(seededRandom() * availableMains.length)];
            }

            weekly_mains.add(main_dish);
            monthlyUsage[main_dish] = (monthlyUsage[main_dish] || 0) + 1;
            
            const {sides} = getMealOptions(main_dish, category, weekly_sides, seededRandom);
            let side_dish_str = sides.join(' and ');
            sides.forEach(s => weekly_sides.add(s.trim()));

            // --- Apply prep task rules ---
            const noPrepRule = RULES.find(r => r.type === 'NO_PREP_ON_CATEGORY' && r.category === category);
            if (!noPrepRule) {
                const coconutRule = RULES.find(r => r.type === 'FORCE_PREP_TASK' && side_dish_str.includes(r.side_includes));
                if(coconutRule) {
                    const task = prep_tasks.filter(t => t.includes(coconutRule.task_type))[0];
                    side_dish_str += ` (+ Prep: ${task})`;
                } else if (easy_dishes_main.includes(main_dish) || easy_dishes_side.some(s => side_dish_str.includes(s))) {
                    const task = prep_tasks[Math.floor(seededRandom() * prep_tasks.length)];
                    side_dish_str += ` (+ Prep: ${task})`;
                }
            }

            schedule.push({
                Date: dt.toISOString().split('T')[0],
                Day: dt.toLocaleDateString('en-US', { weekday: 'long' }),
                MainDish: main_dish,
                SideDish: side_dish_str,
                Category: category
            });
        }
    }
    
    const shoppingList = generateShoppingList(schedule.slice(0,6));
    return { schedule, shoppingList, usedSeed: seed };
}