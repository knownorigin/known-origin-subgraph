import {BigInt} from "@graphprotocol/graph-ts/index";

let burntEditions: Array<number> = [101800, 102000, 102875, 103400, 103525, 103600, 104125, 104525, 104950, 105325,
    105475, 105825, 105850, 106300, 106700, 107000, 107425, 107800, 108300, 108800, 109150, 109525, 110000, 110500,
    110800, 111375, 111825, 112300, 112325, 112500, 112850, 113125, 113450, 114000, 114500, 115100, 115325,
    115475, 115850, 116000, 116525, 116875, 117175, 117625, 117975, 118025, 118400, 118775, 118950, 119200, 119850,
    120050, 120175, 120625, 121100, 121525, 121950, 122075, 122625, 122725, 123525, 123775, 123850, 124075, 124100,
    124375, 124600, 124800, 125200, 125825, 125850, 126350, 126475, 126575, 127025, 127675, 127775, 128275, 128800,
    129375, 129675, 129725, 129850, 130175, 130525, 131125, 131400, 131650, 131750, 132300, 132925, 132950, 133600,
    134150, 134825, 135550, 135575, 137375, 137875, 138425, 138775, 139225, 139375, 141850, 142575, 143150, 143775,
    144225, 144650, 145350, 145750, 145875, 146325, 146525, 146625, 146850, 147250, 147300, 147625, 148125, 148225,
    148375, 149050, 149275, 149725, 149975, 150125, 150800, 151050, 151525, 151750, 151875, 152575, 152800, 152875,
    153225, 153250, 153400, 153825, 153975, 154250, 154500, 154800, 155150, 155450, 155875, 156100, 156400, 156700,
    157350, 157375, 157750, 157850, 157875, 158375, 158525, 159275, 159400, 159450, 159700, 160175, 160275, 160300,
    160350, 160625, 160750, 160875, 161050, 161450, 161475, 161950, 162125, 162400, 162625, 162900, 163375, 163400,
    163625, 163700, 163750, 163775, 163900, 164225, 164300, 165000, 165100, 165325, 165450, 165625, 166075, 166300,
    166875, 166950, 166975, 167375, 167925, 167950, 168625, 169725, 170025, 170625, 171100, 171250, 172650, 173325,
    173425, 174375, 174700, 175300, 175575, 176150, 176325, 176450, 176475, 176525, 176875, 176975, 177500, 177725,
    178575, 178725, 178850, 178875, 179825, 180275, 180950, 180975, 181550, 181675, 181850, 182025, 182350, 182500,
    182525, 182775, 182975, 183825, 184575, 184850, 185650, 185900, 187375, 189175, 189250, 189575, 189625, 191025,
    192250, 192400, 193150, 193325, 193475, 193600, 194425, 195775, 195800, 196050, 196450, 198850, 199000, 199700,
    39300, 39600, 40000, 40100, 40700, 41100, 43200, 46400, 49400, 49500, 49600, 49700, 56100, 56800, 57300, 59800,
    63700, 64000, 64925, 65075, 65275, 65375, 65450, 65500, 65550, 65675, 65925, 66100, 66225, 66275, 66425, 66550,
    66650, 66800, 67250, 68075, 68325, 68475, 68525, 68600, 69100, 69175, 69200, 69275, 69325, 69350, 69375, 69425,
    69475, 69625, 69675, 69700, 69725, 69950, 70025, 70075, 70150, 70200, 70325, 70350, 70450, 70550, 70825, 71075,
    71675, 71750, 71950, 72225, 72350, 72475, 72650, 72700, 72725, 72800, 72950, 72975, 73175, 73225, 73325, 73500,
    73650, 73700, 73750, 73775, 73825, 74100, 74150, 74200, 74400, 74425, 74550, 74650, 74800, 74875, 75025, 75125,
    75250, 75325, 75400, 75525, 75550, 75575, 75600, 75625, 75650, 75725, 75775, 76000, 76125, 76225, 76250, 76425,
    76475, 76525, 76675, 76725, 76775, 76925, 77025, 77225, 77250, 77300, 77375, 77400, 77500, 77675, 77725, 77825,
    77950, 78200, 78300, 78350, 78450, 78575, 78600, 78700, 78750, 78975, 79025, 79200, 79275, 79425, 79525, 79725,
    79750, 79950, 80850, 81050, 81125, 81300, 81400, 81475, 81650, 81725, 81750, 82150, 82250, 82700, 82950, 83025,
    83050, 83125, 83175, 83225, 83375, 83425, 83500, 83550, 83575, 83625, 83650, 83950, 83975, 84100, 84175, 84250,
    84475, 84625, 84700, 84750, 84850, 85050, 85225, 85325, 85500, 85675, 85950, 86050, 86275, 86550, 86725, 86850,
    87075, 87400, 87625, 87675, 87975, 88125, 88325, 88400, 88450, 88725, 88875, 88900, 89025, 89100, 89250, 89400,
    89725, 90075, 90250, 90325, 90550, 90750, 90875, 90975, 91025, 91325, 91450, 91475, 91700, 91925, 92075, 92225,
    92425, 92550, 92600, 92825, 92950, 93175, 93250, 93450, 93525, 93700, 93775, 93975, 94250, 94375, 94425, 94675,
    95025, 95275, 95425, 95500, 95600, 95875, 95975, 96100, 96200, 96250, 96325, 96500, 96600, 96750, 97025, 97175,
    97500, 97600, 97650, 97850, 97900, 98050, 98275, 98600, 99900, 50100, 39400, 39900, 42200]

export function isEditionBurnt(editionNumber: BigInt): boolean {
    return burntEditions.indexOf(editionNumber.toI32()) > -1;
}
