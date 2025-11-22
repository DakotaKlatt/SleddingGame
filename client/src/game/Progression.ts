export interface PlayerStats {
    distance: number;
    maxSpeed: number;
    flips: number;
    wins: number;
}

const COSMETIC_UNLOCKS = [
    { id: 'char_bear', condition: (s: PlayerStats) => s.distance > 5000, name: 'Bear Suit' },
    { id: 'sled_rocket', condition: (s: PlayerStats) => s.maxSpeed > 20, name: 'Rocket Sled' },
    { id: 'hat_viking', condition: (s: PlayerStats) => s.flips >= 3, name: 'Viking Helmet' }
];

export class Progression {
    private static STORAGE_KEY = 'sledding_game_save';

    static load(): string[] {
        const save = localStorage.getItem(this.STORAGE_KEY);
        if (save) {
            return JSON.parse(save).unlocks || [];
        }
        return [];
    }

    static save(unlocks: string[]) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ unlocks }));
    }

    static checkUnlocks(stats: PlayerStats): string[] {
        const currentUnlocks = this.load();
        const newUnlocks: string[] = [];

        COSMETIC_UNLOCKS.forEach(item => {
            if (!currentUnlocks.includes(item.id)) {
                if (item.condition(stats)) {
                    newUnlocks.push(item.id);
                    currentUnlocks.push(item.id);
                }
            }
        });

        if (newUnlocks.length > 0) {
            this.save(currentUnlocks);
        }

        return newUnlocks;
    }
}

